import React from "react" ;
import ReactDOMServer from "react-dom/server" ;
import Select from "react-select" ;
import CreatableSelect from "react-select/creatable" ;
import { gAppRef } from "./index.js" ;
import { makeOptionalLink,  unloadCreatableSelect, pluralString, applyUpdatedVals } from "./utils.js" ;

const axios = require( "axios" ) ;

// --------------------------------------------------------------------

export class PublicationSearchResult extends React.Component
{

    render() {
        const publ = gAppRef.caches.publishers[ this.props.data.publ_id ] ;
        let tags = [] ;
        if ( this.props.data.pub_tags )
            this.props.data.pub_tags.map( t => tags.push( <div key={t} className="tag"> {t} </div> ) ) ;
        return ( <div className="search-result publication"
                    ref = { r => gAppRef.setTestAttribute( r, "pub_id", this.props.data.pub_id ) }
            >
            <div className="name"> { makeOptionalLink( this._makeDisplayName(), this.props.data.pub_url ) }
                { publ && <span className="publisher"> ({publ.publ_name}) </span> }
                <img src="/images/edit.png" className="edit" onClick={this.onEditPublication.bind(this)} alt="Edit this publication." />
                <img src="/images/delete.png" className="delete" onClick={this.onDeletePublication.bind(this)} alt="Delete this publication." />
            </div>
            <div className="description" dangerouslySetInnerHTML={{__html: this.props.data.pub_description}} />
            { tags.length > 0 && <div className="tags"> <label>Tags:</label> {tags} </div> }
        </div> ) ;
    }

    static onNewPublication( notify ) {
        PublicationSearchResult._doEditPublication( {}, (newVals,refs) => {
            axios.post( gAppRef.makeFlaskUrl( "/publication/create", {list:1} ), newVals )
            .then( resp => {
                // update the caches
                gAppRef.caches.publications = resp.data.publications ;
                gAppRef.caches.tags = resp.data.tags ;
                // unload any updated values
                applyUpdatedVals( newVals, newVals, resp.data.updated, refs ) ;
                // update the UI with the new details
                notify( resp.data.pub_id, newVals ) ;
                if ( resp.data.warnings )
                    gAppRef.showWarnings( "The new publication was created OK.", resp.data.warnings ) ;
                else
                    gAppRef.showInfoToast( <div> The new publication was created OK. </div> ) ;
                gAppRef.closeModalForm() ;
            } )
            .catch( err => {
                gAppRef.showErrorMsg( <div> Couldn't create the publication: <div className="monospace"> {err.toString()} </div> </div> ) ;
            } ) ;
        } ) ;
    }

    onEditPublication() {
        PublicationSearchResult._doEditPublication( this.props.data, (newVals,refs) => {
            // send the updated details to the server
            newVals.pub_id = this.props.data.pub_id ;
            axios.post( gAppRef.makeFlaskUrl( "/publication/update", {list:1} ), newVals )
            .then( resp => {
                // update the caches
                gAppRef.caches.publications = resp.data.publications ;
                gAppRef.caches.tags = resp.data.tags ;
                // update the UI with the new details
                applyUpdatedVals( this.props.data, newVals, resp.data.updated, refs ) ;
                this.forceUpdate() ;
                if ( resp.data.warnings )
                    gAppRef.showWarnings( "The publication was updated OK.", resp.data.warnings ) ;
                else
                    gAppRef.showInfoToast( <div> The publication was updated OK. </div> ) ;
                gAppRef.closeModalForm() ;
            } )
            .catch( err => {
                gAppRef.showErrorMsg( <div> Couldn't update the publication: <div className="monospace"> {err.toString()} </div> </div> ) ;
            } ) ;
        } );
    }

    static _doEditPublication( vals, notify ) {
        let refs = {} ;
        // initialize the publishers
        let publishers = [ { value: null, label: <i>(none)</i> } ] ;
        let currPubl = 0 ;
        for ( let p of Object.entries(gAppRef.caches.publishers) ) {
            publishers.push( {
                value: p[1].publ_id,
                label: <span dangerouslySetInnerHTML={{__html: p[1].publ_name}} />
            } ) ;
            if ( p[1].publ_id === vals.publ_id )
                currPubl = publishers.length - 1 ;
        }
        publishers.sort( (lhs,rhs) => {
            return ReactDOMServer.renderToStaticMarkup( lhs.label ).localeCompare( ReactDOMServer.renderToStaticMarkup( rhs.label ) ) ;
        } ) ;
        // initialize the tags
        const tags = gAppRef.makeTagLists( vals.pub_tags ) ;
        // prepare the form content
        const content = <div>
            <div className="row name"> <label> Name: </label>
                <input type="text" defaultValue={vals.pub_name} ref={(r) => refs.pub_name=r} />
            </div>
            <div className="row edition"> <label> Edition: </label>
                <input type="text" defaultValue={vals.pub_edition} ref={(r) => refs.pub_edition=r} />
            </div>
            <div className="row publisher"> <label> Publisher: </label>
                <Select className="react-select" classNamePrefix="react-select" options={publishers} isSearchable={true}
                    defaultValue = { publishers[ currPubl ] }
                    ref = { (r) => refs.publ_id=r }
                />
            </div>
            <div className="row tags"> <label> Tags: </label>
                <CreatableSelect className="react-select" classNamePrefix="react-select" options={tags[1]} isMulti
                    defaultValue = {tags[0]}
                    ref = { (r) => refs.pub_tags=r }
                />
            </div>
            <div className="row description"> <label> Description: </label>
                <textarea defaultValue={vals.pub_description} ref={(r) => refs.pub_description=r} />
            </div>
            <div className="row url"> <label> Web: </label>
                <input type="text" defaultValue={vals.pub_url} ref={(r) => refs.pub_url=r} />
            </div>
        </div> ;
        const buttons = {
            OK: () => {
                // unload the new values
                let newVals = {} ;
                for ( let r in refs ) {
                    if ( r === "publ_id" )
                        newVals[ r ] = refs[r].state.value && refs[r].state.value.value ;
                    else if ( r === "pub_tags" ) {
                        let vals = unloadCreatableSelect( refs[r] ) ;
                        newVals[ r ] = vals.map( v => v.label ) ;
                    } else
                        newVals[ r ] = refs[r].value.trim() ;
                }
                if ( newVals.pub_name === "" ) {
                    gAppRef.showErrorMsg( <div> Please specify the publication's name. </div>) ;
                    return ;
                }
                // notify the caller about the new details
                notify( newVals, refs ) ;
            },
            Cancel: () => { gAppRef.closeModalForm() ; },
        } ;
        const isNew = Object.keys( vals ).length === 0 ;
        gAppRef.showModalForm( isNew?"New publication":"Edit publication", content, buttons ) ;
    }

    onDeletePublication() {
        let doDelete = ( nArticles ) => {
            // confirm the operation
            let warning ;
            if ( typeof nArticles === "number" ) {
                if ( nArticles === 0 )
                    warning = <div> No articles will be deleted. </div> ;
                else
                    warning = <div> { pluralString(nArticles,"associated article") + " will also be deleted." } </div> ;
            } else {
                warning = ( <div> <img className="icon" src="/images/error.png" alt="Error." />
                    WARNING: Couldn't check if any associated articles will be deleted:
                    <div className="monospace"> {nArticles.toString()} </div>
                </div> ) ;
            }
            const content = ( <div>
                Delete this publication?
                <div style={{margin:"0.5em 0 0.5em 2em",fontStyle:"italic"}} dangerouslySetInnerHTML = {{ __html: this._makeDisplayName() }} />
                {warning}
            </div> ) ;
            gAppRef.ask( content, "ask", {
                "OK": () => {
                    // delete the publication on the server
                    axios.get( gAppRef.makeFlaskUrl( "/publication/delete/" + this.props.data.pub_id, {list:1} ) )
                    .then( resp => {
                        // update the caches
                        gAppRef.caches.publications = resp.data.publications ;
                        gAppRef.caches.tags = resp.data.tags ;
                        // update the UI
                        this.props.onDelete( "pub_id", this.props.data.pub_id ) ;
                        resp.data.deleteArticles.forEach( article_id => {
                            this.props.onDelete( "article_id", article_id ) ;
                        } ) ;
                        if ( resp.data.warnings )
                            gAppRef.showWarnings( "The publication was deleted.", resp.data.warnings ) ;
                        else
                            gAppRef.showInfoToast( <div> The publication was deleted. </div> ) ;
                    } )
                    .catch( err => {
                        gAppRef.showErrorToast( <div> Couldn't delete the publication: <div className="monospace"> {err.toString()} </div> </div> ) ;
                    } ) ;
                },
                "Cancel": null,
            } ) ;
        }
        // get the publication details
        axios.get( gAppRef.makeFlaskUrl( "/publication/" + this.props.data.pub_id ) )
        .then( resp => {
            doDelete( resp.data.nArticles ) ;
        } )
        .catch( err => {
            doDelete( err ) ;
        } ) ;
    }

    _makeDisplayName() {
        if ( this.props.data.pub_edition )
            return this.props.data.pub_name + " (" + this.props.data.pub_edition + ")" ;
        else
            return this.props.data.pub_name ;
    }

}
