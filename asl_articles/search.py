""" Handle search requests. """

import logging

from flask import request, jsonify

from asl_articles import app
from asl_articles.models import Publisher

_logger = logging.getLogger( "search" )

# ---------------------------------------------------------------------

@app.route( "/search", methods=["POST"] )
def search():
    """Run a search query."""
    query_string = request.json.get( "query" ).strip()
    _logger.debug( "SEARCH: [%s]", query_string )
    query = Publisher.query
    if query_string:
        query = query.filter(
            Publisher.publ_name.ilike( "%{}%".format( query_string ) )
        )
    publishers = list( query )
    _logger.debug( "- Found: %s", " ; ".join( str(p) for p in publishers ) )
    publishers = [ {
        "type": "publ",
        "id": p.publ_id,
        "publ_name": p.publ_name
    } for p in publishers ]
    return jsonify( publishers )
