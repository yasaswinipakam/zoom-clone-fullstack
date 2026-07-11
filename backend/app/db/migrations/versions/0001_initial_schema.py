"""Create the initial Zoom Clone schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(200), nullable=False), sa.Column("email", sa.String(254), nullable=False, unique=True))
    op.create_table("meetings", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("meeting_code", sa.String(20), nullable=False, unique=True), sa.Column("title", sa.String(200), nullable=False), sa.Column("description", sa.Text()), sa.Column("meeting_type", sa.String(20), nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("host_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("scheduled_at", sa.DateTime()), sa.Column("duration_minutes", sa.Integer()), sa.Column("started_at", sa.DateTime()), sa.Column("ended_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.CheckConstraint("duration_minutes IS NULL OR (duration_minutes >= 5 AND duration_minutes <= 480)", name="ck_meetings_duration_minutes_range"))
    op.create_index("ix_meetings_meeting_code", "meetings", ["meeting_code"], unique=True)
    op.create_index("ix_meetings_host_id", "meetings", ["host_id"])
    op.create_index("ix_meetings_host_id_status", "meetings", ["host_id", "status"])
    op.create_index("ix_meetings_status_scheduled_at", "meetings", ["status", "scheduled_at"])
    op.create_table("participants", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False), sa.Column("display_name", sa.String(100), nullable=False), sa.Column("participant_status", sa.String(20), nullable=False), sa.Column("is_host", sa.Boolean(), nullable=False), sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.Column("left_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])
    op.create_index("ix_participants_meeting_id_status", "participants", ["meeting_id", "participant_status"])


def downgrade() -> None:
    op.drop_table("participants")
    op.drop_table("meetings")
    op.drop_table("users")
