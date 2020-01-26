"""Added page numbers to articles.

Revision ID: 07ff815f36b7
Revises: e77d4e8d37f3
Create Date: 2020-01-23 05:36:12.405233

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '07ff815f36b7'
down_revision = 'e77d4e8d37f3'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('article', sa.Column('article_pageno', sa.String(length=20), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('article', 'article_pageno')
    # ### end Alembic commands ###