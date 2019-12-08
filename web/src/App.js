import React from "react" ;
import ReactDOMServer from "react-dom/server" ;
import { ToastContainer, toast } from "react-toastify" ;
import "react-toastify/dist/ReactToastify.min.css" ;
import SearchForm from "./SearchForm" ;
import { SearchResults } from "./SearchResults" ;
import { PublisherSearchResult } from "./PublisherSearchResult" ;
import { PublicationSearchResult } from "./PublicationSearchResult" ;
import { ArticleSearchResult } from "./ArticleSearchResult" ;
import ModalForm from "./ModalForm";
import AskDialog from "./AskDialog" ;
import "./App.css" ;

const axios = require( "axios" ) ;
const queryString = require( "query-string" ) ;

// --------------------------------------------------------------------

export default class App extends React.Component
{
    constructor( props ) {

        // initialize the App
        super( props ) ;
        this.state = {
            searchResults: [],
            searchSeqNo: 0,
            modalForm: null,
            askDialog: null,
        } ;

        // initialize
        const args = queryString.parse( window.location.search ) ;
        this._storeMsgs = process.env.REACT_APP_TEST_MODE && args.store_msgs ;

        // figure out the base URL of the Flask backend server
        // NOTE: We allow the caller to do this since the test suite will usually spin up
        // it's own Flask server, but talks to an existing React server, so we need some way
        // for pytest to change which Flask server the React frontend code should tak to.
        this._flaskBaseUrl = process.env.REACT_APP_TEST_MODE ? args._flask : null ;
        if ( ! this._flaskBaseUrl )
            this._flaskBaseUrl = process.env.REACT_APP_FLASK_URL ;
    }

    render() {
        return ( <div>
            <div id="menu">
                [<a href="/" className="new-publisher"
                    onClick={ (e) => { e.preventDefault() ; PublisherSearchResult.onNewPublisher( this._onNewPublisher.bind(this) ) ; } }
                >New publisher</a>]
                [<a href="/" className="new-publication"
                    onClick={ (e) => { e.preventDefault() ; PublicationSearchResult.onNewPublication( this._onNewPublication.bind(this) ) ; } }
                >New publication</a>]
                [<a href="/" className="new-article"
                    onClick={ (e) => { e.preventDefault() ; ArticleSearchResult.onNewArticle( this._onNewArticle.bind(this) ) ; } }
                >New article</a>]
            </div>
            <SearchForm onSearch={this.onSearch.bind(this)} />
            <SearchResults seqNo={this.state.searchSeqNo} searchResults={this.state.searchResults} />
            { this.state.modalForm !== null &&
                <ModalForm show={true} title={this.state.modalForm.title} content={this.state.modalForm.content} buttons={this.state.modalForm.buttons} />
            }
            { this.state.askDialog !== null &&
                <AskDialog show={true} content={this.state.askDialog.content} buttons={this.state.askDialog.buttons} />
            }
            <ToastContainer position="bottom-right" hideProgressBar={true} />
            { this._storeMsgs && <div>
                <textarea id="_stored_msg-info_toast_" ref="_stored_msg-info_toast_" defaultValue="" hidden={true} />
                <textarea id="_stored_msg-warning_toast_" ref="_stored_msg-warning_toast_" defaultValue="" hidden={true} />
                <textarea id="_stored_msg-error_toast_" ref="_stored_msg-error_toast_" defaultValue="" hidden={true} />
            </div> }
        </div> ) ;
    }

    componentDidMount() {
        // initialize the caches
        // NOTE: We maintain caches of the publishers and publications, so that we can quickly populate droplists.
        // The backend server returns updated lists after any operation that could change them (create/update/delete),
        // which is simpler and less error-prone than trying to manually keep our caches in sync. It's less efficient,
        // but it won't happen too often, there won't be too many entries, and the database server is local.
        this.caches = {} ;
        axios.get( this.makeFlaskUrl( "/publishers" ) )
        .then( resp => {
            this.caches.publishers = resp.data ;
        } )
        .catch( err => {
            this.showErrorToast( <div> Couldn't load the publishers: <div className="monospace"> {err.toString()} </div> </div> ) ;
        } ) ;
        axios.get( this.makeFlaskUrl( "/publications" ) )
        .then( resp => {
            this.caches.publications = resp.data ;
        } )
        .catch( err => {
            this.showErrorToast( <div> Couldn't load the publications: <div className="monospace"> {err.toString()} </div> </div> ) ;
        } ) ;
    }

    onSearch( query ) {
        // run the search
        axios.post( this.makeFlaskUrl( "/search" ), {
            query: query
        } )
        .then( resp => {
            this.setState( { searchResults: resp.data, searchSeqNo: this.state.searchSeqNo+1 } ) ;
        } )
        .catch( err => {
            this.showErrorToast( <div> The search query failed: <div className="monospace"> {err.toString()} </div> </div> ) ;
            this.setState( { searchResults: null, searchSeqNo: this.state.searchSeqNo+1 } ) ;
        } ) ;
    }

    _onNewPublisher( publ_id, vals ) { this._addNewSearchResult( vals, "publisher", "publ_id", publ_id ) ; }
    _onNewPublication( pub_id, vals ) { this._addNewSearchResult( vals, "publication", "pub_id", pub_id ) ; }
    _onNewArticle( article_id, vals ) { this._addNewSearchResult( vals, "article", "article_id", article_id ) ; }
    _addNewSearchResult( vals, srType, idName, idVal ) {
        // add the new search result to the start of the search results
        // NOTE: This isn't really the right thing to do, since the new object might not actually be
        // a result for the current search, but it's nice to give the user some visual feedback.
        vals.type = srType ;
        vals[ idName ] = idVal ;
        let newSearchResults = [ vals ] ;
        newSearchResults.push( ...this.state.searchResults ) ;
        this.setState( { searchResults: newSearchResults } ) ;
    }

    showModalForm( title, content, buttons ) {
        // prepare the buttons
        let buttons2 = [] ;
        for ( let b in buttons ) {
            let notify = buttons[ b ] ;
            buttons2[ b ] = () => {
                // a button was clicked - notify the caller
                if ( notify )
                    notify() ;
                // NOTE: We don't automatically dismiss the dialog here, since the form might not want to close
                // e.g. if it had problems updating something on the server. The form must dismiss the dialog manually.
            } ;
        }
        // show the dialog
        this.setState( {
            modalForm: { title: title, content: content, buttons: buttons2 },
        } ) ;
    }

    closeModalForm() {
        this.setState( { modalForm: null } ) ;
    }

    showInfoToast( msg ) { this._doShowToast( "info", msg, 5*1000 ) ; }
    showWarningToast( msg ) { this._doShowToast( "warning", msg, 15*1000 ) ; }
    showErrorToast( msg ) { this._doShowToast( "error", msg, false ) ; }
    _doShowToast( type, msg, autoClose ) {
        if ( this._storeMsgs ) {
            // save the message for the test suite to retrieve (nb: we also don't show the toast itself
            // since these build up when tests are running at high speed, and obscure elements that
            // we want to click on :-/
            this.refs[ "_stored_msg-" + type + "_toast_" ].value = ReactDOMServer.renderToStaticMarkup( msg ) ;
            return ;
        }
        toast( msg, { type: type, autoClose: autoClose } ) ;
    }

    showErrorMsg( content ) {
        // show the error message in a modal dialog
        this.ask(
            <div> <img className="icon" src="/images/error.png" alt="Error." /> {content} </div>,
            { "OK": null }
        ) ;
    }

    ask( content, buttons ) {
        // prepare the buttons
        let buttons2 = [] ;
        for ( let b in buttons ) {
            let notify = buttons[ b ] ;
            buttons2[ b ] = () => {
                // a button was clicked - notify the caller
                if ( notify )
                    notify() ;
                // dismiss the dialog
                this.setState( { askDialog: null } ) ;
            } ;
        }
        // show the dialog
        this.setState( { askDialog: { content: content, buttons: buttons2 } } ) ;
    }

    logInternalError( msg, detail ) {
        // log an internal error
        this.showErrorToast( <div>
            INTERNAL ERROR <div>{msg}</div>
            {detail && <div className="monospace">{detail}</div>}
        </div> ) ;
        console.log( "INTERNAL ERROR: " + msg ) ;
        if ( detail )
            console.log( detail ) ;
    }

    makeFlaskUrl( url, args ) {
        // generate a URL for the Flask backend server
        url = this._flaskBaseUrl + url ;
        if ( args ) {
            let args2 = [] ;
            for ( let a in args )
                args2.push( a + "=" + encodeURIComponent( args[a] ) ) ;
            url = url + "?" + args2.join("&") ;
        }
        return url ;
    }

}
