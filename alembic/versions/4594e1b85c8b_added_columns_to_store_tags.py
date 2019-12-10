"""Added columns to store tags.

Revision ID: 4594e1b85c8b
Revises: 85abe5bcbac0
Create Date: 2019-12-09 09:21:42.902996

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4594e1b85c8b'
down_revision = '85abe5bcbac0'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('article', sa.Column('article_tags', sa.String(length=1000), nullable=True))
    op.add_column('publication', sa.Column('pub_tags', sa.String(length=1000), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('publication', 'pub_tags')
    op.drop_column('article', 'article_tags')
    # ### end Alembic commands ###