"""
Main API routes for the Cerina Protocol Foundry.
"""

from datetime import datetime
from typing import List, Optional, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
import json
import asyncio
from sse_starlette.sse import EventSourceResponse

from state.protocol_state import ProtocolState, ApprovalStatus
from state.schemas import (
    GenerationRequest,
    GenerationResponse,
    StateResponse,
    ResumeRequest,
    HealthResponse,
    DetailedStateResponse,
    ErrorResponse
)
from graph.workflow import create_protocol_workflow, get_workflow_stats
from graph.streaming import stream_workflow_events
from database import get_checkpointer, get_async_checkpointer
from utils.logger import logger
from config import settings

from .dependencies import get_current_state, verify_api_key


router = APIRouter(prefix="/api", tags=["protocol"])


# Health Check

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        checkpointer = get_checkpointer()
        db_connected = checkpointer is not None
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now(),
            version="1.0.0",
            database_connected=db_connected
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.now(),
            version="1.0.0",
            database_connected=False
        )


# Protocol Generation

@router.post("/generate", response_model=GenerationResponse)
async def generate_protocol(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    api_key_valid: bool = Depends(verify_api_key)
):
    """
    Initiate a new protocol generation workflow.
    
    This creates a new thread and starts the agent workflow.
    - For web requests: Workflow halts for human review
    - For MCP requests: Workflow bypasses halt and returns final protocol
    """
    logger.info(f"Received generation request: {request.user_intent}")
    
    # Check if 'source' attribute exists on request, default to 'web' if not
    source = getattr(request, "source", "web")
    logger.info(f"Request source: {source}")

    try:
        # Generate unique thread ID
        thread_id = str(uuid4())
        
        # Determine if we should bypass halt (for logging purposes)
        bypass_halt = (source == "mcp")
        logger.info(f"Bypass halt mode: {bypass_halt}")

        # Create initial state
        # CRITICAL FIX: We pass 'source' to ProtocolState so the Supervisor can see it
        initial_state = ProtocolState(
            thread_id=thread_id,
            user_intent=request.user_intent,
            max_iterations=request.max_iterations or settings.max_agent_iterations,
            source=source  # <--- PASSING SOURCE CORRECTLY
        )
        
        # Configuration for LangGraph with increased recursion limit
        config = {
            "configurable": {
                "thread_id": thread_id
            },
            "recursion_limit": 50
        }
        
        logger.info(f"Starting workflow for thread: {thread_id}")
        
        workflow_graph = create_protocol_workflow()
        
        async with get_async_checkpointer() as checkpointer:
            compiled_workflow = workflow_graph.compile(checkpointer=checkpointer)
            
            # Start the graph
            # It will run until it hits "halt" (Web) or "finalize" (MCP)
            result = await compiled_workflow.ainvoke(initial_state, config)
        
        # LangGraph returns a dictionary, convert back to object wrapper if needed
        if isinstance(result, dict):
            # We construct a temporary object to access fields easily for logging
            # (Note: Pydantic models expect keyword args)
            final_status = result.get("approval_status")
            iteration_count = result.get("iteration_count")
            created_at = result.get("created_at")
        else:
            final_status = result.approval_status
            iteration_count = result.iteration_count
            created_at = result.created_at
        
        logger.info(f"Workflow completed/halted for thread: {thread_id}")
        logger.info(f"Final state: {final_status}, Iteration: {iteration_count}")
        
        # Determine response message
        if bypass_halt:
            message = "Protocol generation completed. Workflow finalized automatically (MCP mode)."
        else:
            message = "Protocol generation initiated successfully. Workflow halted for human review."
        
        return GenerationResponse(
            thread_id=thread_id,
            status=str(final_status),
            message=message,
            user_intent=request.user_intent,
            created_at=created_at or datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error during protocol generation: {str(e)}")
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail=f"Protocol generation failed: {str(e)}"
        )


# State Management

@router.get("/state/{thread_id}", response_model=StateResponse)
async def get_state(
    thread_id: str,
    api_key_valid: bool = Depends(verify_api_key)
):
    """Get the current state of a protocol generation workflow."""
    logger.info(f"Retrieving state for thread: {thread_id}")
    
    try:
        state = get_current_state(thread_id)
        
        return StateResponse(
            thread_id=state.thread_id,
            user_intent=state.user_intent,
            current_draft=state.current_draft,
            final_approved_draft=state.final_approved_draft if state.final_approved_draft else None,
            iteration_count=state.iteration_count,
            max_iterations=state.max_iterations,
            approval_status=state.approval_status,
            metadata=state.metadata,
            safety_flags_count=len(state.safety_flags),
            critic_feedbacks_count=len(state.critic_feedbacks),
            has_blocking_issues=state.has_blocking_safety_issues() or state.has_major_quality_issues(),
            is_finalized=state.is_finalized,
            halted_at_iteration=state.halted_at_iteration,
            created_at=state.created_at,
            last_modified=state.last_modified,
            halted_at=state.halted_at,
            approved_at=state.approved_at,
            current_agent=getattr(state, 'current_agent', None),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving state: {str(e)}")
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve state: {str(e)}"
        )


@router.get("/state/{thread_id}/detailed", response_model=DetailedStateResponse)
async def get_detailed_state(
    thread_id: str,
    api_key_valid: bool = Depends(verify_api_key)
):
    """Get detailed state including full agent history."""
    logger.info(f"Retrieving detailed state for thread: {thread_id}")
    
    try:
        state = get_current_state(thread_id)
        
        return DetailedStateResponse(
            thread_id=state.thread_id,
            user_intent=state.user_intent,
            current_draft=state.current_draft,
            final_approved_draft=state.final_approved_draft if state.final_approved_draft else None,
            iteration_count=state.iteration_count,
            max_iterations=state.max_iterations,
            approval_status=state.approval_status,
            metadata=state.metadata,
            safety_flags_count=len(state.safety_flags),
            critic_feedbacks_count=len(state.critic_feedbacks),
            has_blocking_issues=state.has_blocking_safety_issues() or state.has_major_quality_issues(),
            is_finalized=state.is_finalized,
            halted_at_iteration=state.halted_at_iteration,
            created_at=state.created_at,
            last_modified=state.last_modified,
            halted_at=state.halted_at,
            approved_at=state.approved_at,
            draft_versions=[v.model_dump() for v in state.draft_versions],
            safety_flags=[f.model_dump() for f in state.safety_flags],
            critic_feedbacks=[f.model_dump() for f in state.critic_feedbacks],
            supervisor_decisions=[d.model_dump() for d in state.supervisor_decisions],
            drafter_notes=[n.model_dump() for n in state.drafter_notes],
            errors=state.errors,
            scratchpad=state.scratchpad
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving detailed state: {str(e)}")
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve detailed state: {str(e)}"
        )


# Human-in-Loop

@router.post("/resume/{thread_id}")
async def resume_workflow(
    thread_id: str,
    request: ResumeRequest,
    api_key_valid: bool = Depends(verify_api_key)
):
    """Resume a halted workflow after human review."""
    logger.info(f"Resuming workflow for thread: {thread_id} with action: {request.action}")
    
    try:
        if request.thread_id != thread_id:
            raise HTTPException(status_code=400, detail="Thread ID mismatch")
        
        state = get_current_state(thread_id)
        
        # Verify state is halted
        if not state.should_halt and not state.approval_status == ApprovalStatus.PENDING_HUMAN_REVIEW:
            raise HTTPException(
                status_code=400,
                detail=f"Workflow is not halted. Current status: {state.approval_status}"
            )
        
        if request.action == "approve":
            logger.info(f"Approving protocol for thread: {thread_id}")
            state.approve()
            
        elif request.action == "edit":
            if not request.edited_draft:
                raise HTTPException(status_code=400, detail="edited_draft required")
            state.approve(edited_draft=request.edited_draft)
            
        elif request.action == "reject":
            if not request.feedback:
                raise HTTPException(status_code=400, detail="feedback required")
            state.reject(feedback=request.feedback)
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
        # Resume workflow
        workflow_graph = create_protocol_workflow()
        config = {
            "configurable": {"thread_id": thread_id},
            "recursion_limit": 50
        }
        
        async with get_async_checkpointer() as checkpointer:
            compiled_workflow = workflow_graph.compile(checkpointer=checkpointer)
            result = await compiled_workflow.ainvoke(state, config)
            
        # Refetch state to return response
        final_state = get_current_state(thread_id)
        
        return StateResponse(
            thread_id=final_state.thread_id,
            user_intent=final_state.user_intent,
            current_draft=final_state.current_draft,
            final_approved_draft=final_state.final_approved_draft if final_state.final_approved_draft else None,
            iteration_count=final_state.iteration_count,
            max_iterations=final_state.max_iterations,
            approval_status=final_state.approval_status,
            metadata=final_state.metadata,
            safety_flags_count=len(final_state.safety_flags),
            critic_feedbacks_count=len(final_state.critic_feedbacks),
            has_blocking_issues=final_state.has_blocking_safety_issues() or final_state.has_major_quality_issues(),
            is_finalized=final_state.is_finalized,
            halted_at_iteration=final_state.halted_at_iteration,
            created_at=final_state.created_at,
            last_modified=final_state.last_modified,
            halted_at=final_state.halted_at,
            approved_at=final_state.approved_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming workflow: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Failed to resume: {str(e)}")


# Workflow Stats & Draft Management

@router.get("/workflow/stats/{thread_id}")
async def get_workflow_statistics(thread_id: str, api_key_valid: bool = Depends(verify_api_key)):
    try:
        state = get_current_state(thread_id)
        return get_workflow_stats(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workflow/{thread_id}")
async def delete_workflow(thread_id: str, api_key_valid: bool = Depends(verify_api_key)):
    try:
        return {"message": "Workflow deleted", "thread_id": thread_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/draft/{thread_id}")
async def get_current_draft(thread_id: str, api_key_valid: bool = Depends(verify_api_key)):
    try:
        state = get_current_state(thread_id)
        return {
            "thread_id": thread_id,
            "current_draft": state.current_draft,
            "word_count": len(state.current_draft.split()) if state.current_draft else 0,
            "iteration": state.iteration_count,
            "last_modified": state.last_modified.isoformat() if state.last_modified else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/draft/{thread_id}/versions")
async def get_draft_versions(thread_id: str, api_key_valid: bool = Depends(verify_api_key)):
    try:
        state = get_current_state(thread_id)
        versions = [{
            "version": v.version_number,
            "content": v.content,
            "iteration": v.iteration
        } for v in state.draft_versions]
        return {"thread_id": thread_id, "versions": versions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-stream")
async def generate_protocol_stream(
    request: GenerationRequest,
    api_key_valid: bool = Depends(verify_api_key)
):
    """
    Stream protocol generation with real-time updates (for Web UI).
    """
    logger.info(f"[SSE] Starting streaming generation: {request.user_intent}")
    
    # Generate thread_id immediately
    thread_id = str(uuid4())
    
    async def event_generator():
        try:
            # Send 'started' event immediately
            logger.info(f"[SSE] Sending 'started' event for thread {thread_id}")
            
            started_data = json.dumps({
                'type': 'started',
                'thread_id': thread_id,
                'user_intent': request.user_intent,
                'max_iterations': request.max_iterations or settings.max_agent_iterations,
                'timestamp': datetime.now().isoformat()
            })
            yield f"event: started\n"
            yield f"data: {started_data}\n\n"
            
            # Create initial state
            initial_state = ProtocolState(
                thread_id=thread_id,
                user_intent=request.user_intent,
                max_iterations=request.max_iterations or settings.max_agent_iterations,
                source="web"
            )
            
            # Configuration
            config = {
                "configurable": {"thread_id": thread_id},
                "recursion_limit": 50
            }
            
            logger.info(f"[SSE] Running workflow for thread: {thread_id}")
            
            # Create and compile workflow
            workflow_graph = create_protocol_workflow()
            
            async with get_async_checkpointer() as checkpointer:
                compiled_workflow = workflow_graph.compile(checkpointer=checkpointer)
                
                # Stream workflow execution
                async for event in compiled_workflow.astream(initial_state, config):
                    logger.info(f"[SSE] Workflow event: {list(event.keys())}")
                    
                    # Extract state from event
                    for node_name, state_update in event.items():
                        # Skip internal nodes
                        if node_name.startswith('__'):
                            logger.info(f"[SSE] Skipping internal node: {node_name}")
                            continue
                        
                        logger.info(f"[SSE] Node={node_name}, StateType={type(state_update).__name__}")
                        
                        try:
                            # ⭐ EXTRACT QUALITY SCORE SAFELY
                            def get_quality_score(state_obj):
                                """Extract quality score from various state formats"""
                                try:
                                    # Try to get metadata
                                    metadata = None
                                    if isinstance(state_obj, dict):
                                        metadata = state_obj.get("metadata", {})
                                    elif hasattr(state_obj, 'metadata'):
                                        metadata = state_obj.metadata
                                    
                                    # Extract quality score from metadata
                                    if metadata:
                                        # If metadata is a dict
                                        if isinstance(metadata, dict):
                                            return metadata.get("overall_quality_score", 0)
                                        # If metadata is a Pydantic object
                                        elif hasattr(metadata, 'overall_quality_score'):
                                            return getattr(metadata, 'overall_quality_score', 0)
                                        # If metadata has dict-like access
                                        elif hasattr(metadata, '__dict__'):
                                            return metadata.__dict__.get('overall_quality_score', 0)
                                    
                                    # Fallback: check if quality_score exists at root level
                                    if isinstance(state_obj, dict):
                                        return state_obj.get("quality_score", 0)
                                    elif hasattr(state_obj, 'quality_score'):
                                        return getattr(state_obj, 'quality_score', 0)
                                    
                                    return 0
                                except Exception as e:
                                    logger.warning(f"Could not extract quality score: {e}")
                                    return 0
                            
                            # Extract values based on state type
                            if isinstance(state_update, dict):
                                current_iteration = state_update.get('iteration_count', 0)
                                approval_status = state_update.get('approval_status', 'in_progress')
                                quality_score = get_quality_score(state_update)
                                safety_flags = state_update.get('safety_flags', [])
                            elif isinstance(state_update, ProtocolState):
                                current_iteration = state_update.iteration_count
                                approval_status = state_update.approval_status
                                quality_score = get_quality_score(state_update)
                                safety_flags = state_update.safety_flags
                            else:
                                logger.warning(f"[SSE] Unexpected state type: {type(state_update)}, skipping")
                                continue
                            
                            # Map node names to agent names
                            agent_map = {
                                'initialize': 'supervisor',
                                'drafter': 'drafter',
                                'safety_guardian': 'safety_guardian', 
                                'clinical_critic': 'clinical_critic',
                                'supervisor': 'supervisor',
                                'halt': 'halt',
                            }
                            
                            mapped_agent = agent_map.get(node_name, node_name)
                            
                            # Convert approval status to string
                            if hasattr(approval_status, 'value'):
                                approval_status = approval_status.value
                            else:
                                approval_status = str(approval_status)
                            
                            logger.info(f"[SSE] Sending update: node={node_name}, agent={mapped_agent}, iter={current_iteration}, status={approval_status}, quality={quality_score}")
                            
                            # Build update data
                            update_data = json.dumps({
                                'type': 'update',
                                'thread_id': thread_id,
                                'node': node_name,
                                'current_agent': mapped_agent,
                                'iteration_count': current_iteration,
                                'approval_status': approval_status,
                                'quality_score': quality_score,
                                'safety_flags_count': len(safety_flags) if isinstance(safety_flags, list) else 0,
                                'timestamp': datetime.now().isoformat()
                            })
                            
                            yield f"event: update\n"
                            yield f"data: {update_data}\n\n"
                            
                            logger.info(f"[SSE] Update sent successfully")
                            
                            # Check if workflow halted
                            if approval_status in ["pending_human_review", "approved", "rejected"]:
                                logger.info(f"[SSE] Workflow completed with status: {approval_status}")
                                
                                # Build completion data
                                complete_data = json.dumps({
                                    'type': 'complete',
                                    'thread_id': thread_id,
                                    'approval_status': approval_status,
                                    'iteration_count': current_iteration,
                                    'message': 'Workflow halted for human review',
                                    'timestamp': datetime.now().isoformat()
                                })
                                
                                yield f"event: complete\n"
                                yield f"data: {complete_data}\n\n"
                                
                                logger.info(f"[SSE] Stream completed for thread: {thread_id}")
                                return
                                
                        except Exception as node_error:
                            logger.error(f"[SSE] Error processing node {node_name}: {node_error}")
                            logger.exception(node_error)
                            continue


                # If we exit the loop without halting
                logger.info(f"[SSE] Workflow completed normally for thread: {thread_id}")
                
                final_data = json.dumps({
                    'type': 'complete',
                    'thread_id': thread_id,
                    'approval_status': 'completed',
                    'message': 'Workflow completed',
                    'timestamp': datetime.now().isoformat()
                })
                
                yield f"event: complete\n"
                yield f"data: {final_data}\n\n"
                
        except Exception as e:
            logger.error(f"[SSE] Error in stream: {e}")
            logger.exception(e)
            
            # Build error data
            error_data = json.dumps({
                'type': 'error',
                'thread_id': thread_id if 'thread_id' in locals() else 'unknown',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            
            yield f"event: error\n"
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
