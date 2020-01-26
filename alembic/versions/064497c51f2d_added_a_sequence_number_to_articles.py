"""Added a sequence number to articles.

Revision ID: 064497c51f2d
Revises: 07ff815f36b7
Create Date: 2020-01-23 06:30:49.893693

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '064497c51f2d'
down_revision = '07ff815f36b7'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('article', sa.Column('article_seqno', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('article', 'article_seqno')
    # ### end Alembic commands ###