﻿




(function () {
    "use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;



    // Expose notes data source
    var notesDataSource = new DataSources.FileDataSource("notes.json");
    WinJS.Namespace.define("MyApp", {
        notesDataSource: notesDataSource
    });

    // Handle requests for search suggestions
    Windows.ApplicationModel.Search.SearchPane.getForCurrentView().onsuggestionsrequested = function (e) {
        var queryText = e.queryText;
        var searchSuggestions = e.request.searchSuggestionCollection;

        // Needed because we are async
        var deferral = e.request.getDeferral();

        // Get all of the notes
        notesDataSource.getAll().then(function (notes) {
            // Get matching results
            var MAX_RESULTS = 3;
            for (var i = 0; i < notes.length; i++) {
                var note = notes[i].data;
                if (note.title.toLowerCase().indexOf(queryText.toLowerCase()) >= 0) {
                    searchSuggestions.appendQuerySuggestion(note.title);
                }
                if (searchSuggestions.size >= MAX_RESULTS) {
                    break;
                }
            }

            // All done
            deferral.complete();
        });
    };


    app.addEventListener("activated", function (args) {

        // Navigate to search results on search
        if (args.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.search) {
            return WinJS.Navigation.navigate(
                "/pages/searchResults/searchResults.html",
                { searchDetails: args.detail }
            );
        }


        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(
                function () {
                    if (nav.location) {
                        nav.history.current.initialPlaceholder = true;
                        return nav.navigate(nav.location, nav.state);
                    } else {
                        return nav.navigate(Application.navigator.home);
                    }
                }).then(function () {
                    var lvNotes = document.getElementById("lvNotes").winControl;

                    // Wire-up AppBar
                    document.getElementById("cmdAdd").addEventListener("click", function (e) {
                        e.preventDefault();
                        nav.navigate("/pages/add/add.html");
                    });
                    document.getElementById("cmdDelete").addEventListener("click", function (e) {
                        e.preventDefault();
                        if (lvNotes.selection.count() == 1) {
                            lvNotes.selection.getItems().done(function (items) {
                                MyApp.notesDataSource.remove(items[0].key);
                            });
                        }
                    });
                })
            );
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
    };


    var share = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
    share.addEventListener("datarequested", function (e) {
        var lvNotes = document.getElementById("lvNotes").winControl;

        if (lvNotes.selection.count() == 1) {
            lvNotes.selection.getItems().done(function (items) {
                var itemToShare = items[0].data;
                e.request.data.properties.title = itemToShare.title;
                e.request.data.properties.description = "Share a Note";

                // Share plain text version
                e.request.data.setText( convertToText(itemToShare.contents));

                // Share HTML version
                var htmlFormatHelper = Windows.ApplicationModel.DataTransfer.HtmlFormatHelper;
                e.request.data.setHtmlFormat(htmlFormatHelper.createHtmlFormat(itemToShare.contents));
            });
        } else {
            e.request.failWithDisplayText("Please select a note to share.");
        }

    });
    
    // Converts HTML string to plain text string
    function convertToText(html) {
        var div = document.createElement("DIV");
        div.innerHTML = html;
        return div.innerText;
    }


    app.start();
})();
