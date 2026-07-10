"""HTTP route declarations (Constitution Section 10).

Milestone 3 introduces the Meeting API layer.  The ``meeting_router``
is re-exported here so ``main.py`` mounts it through a single, stable
import surface rather than reaching into the submodule directly.
"""

from app.routers.meeting_router import router as meeting_router

__all__ = ["meeting_router"]
