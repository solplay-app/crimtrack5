"""Ajoute un identifiant client idempotent sur les lectures ANPR.

Permet à l'application mobile de rejouer une lecture mise en file locale
(hors ligne ou après timeout réseau) sans créer de doublon côté serveur.

Revision ID: 0006_anpr_client_uid
Revises: 0005_anpr_video
Create Date: 2026-07-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_anpr_client_uid"
down_revision: Union[str, None] = "0005_anpr_video"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("lectures_anpr", sa.Column("client_uid", sa.String(), nullable=True))
    op.create_index(op.f("ix_lectures_anpr_client_uid"), "lectures_anpr", ["client_uid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_lectures_anpr_client_uid"), table_name="lectures_anpr")
    op.drop_column("lectures_anpr", "client_uid")
