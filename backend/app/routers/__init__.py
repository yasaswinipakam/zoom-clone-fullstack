"""HTTP route declarations (Constitution Section 10).

Milestones 3 and 5 introduce the Meeting and Participant API layers.
Both routers are re-exported here so ``main.py`` mounts them through a
single, stable import surface rather than reaching into submodules
directly.
"""

from app.routers.meeting_router import router as meeting_router
from app.routers.participant_router import router as participant_router

__all__ = ["meeting_router", "participant_router"]
