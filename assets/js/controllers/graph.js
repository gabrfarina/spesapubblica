"use strict"

angular
.module("spesapubblica")
.controller("graph_ctrl", [
        "$scope", "$state", "$stateParams", "info", "mapchart", "dataloader",
        function($scope, $state, $stateParams, info, mapchart, dataloader) {
    // pass "info" object to the scope
    $scope.info = info

    // TODO: maybe, after clearing search_text, we can focus somewhere
    //       (at the moment, if you hit "send", the floating label stays up)
    info.search_text = ""

    if ($stateParams.regione_id !== undefined) {
        // regione
        $.when(dataloader.regione_prepare_urls).done(function() {
            let regione_id = dataloader.regione_url_2_id[$stateParams.regione_id]
            info.location = dataloader.regione_id_2_name[regione_id].name_with_denomination

            if ($stateParams.g === undefined) {
                info.granularity = 2
            } else {
                var g = parseInt($stateParams.g)
                if (g < 2) {
                    $state.go("dashboard.italia")
                }
                info.granularity = g
            }

            mapchart.change_state({
                t: "r",
                id: regione_id
            });
        })
    } else if ($stateParams.provincia_id !== undefined) {
        // provincia
        $.when(dataloader.provincia_prepare_urls, dataloader.provincia_prepare_parents).done(function() {
            let provincia_id = dataloader.provincia_url_2_id[$stateParams.provincia_id]
            info.location = dataloader.provincia_id_2_name[provincia_id].name_with_denomination

            if ($stateParams.g === undefined) {
                info.granularity = 3
            } else {
                var g = parseInt($stateParams.g)
                if (g < 2) {
                    $state.go("dashboard.italia")
                } else if (g < 3) {
                    var id = dataloader.provincia_parent[provincia_id]
                    $state.go("dashboard.regione", {regione_id: dataloader.regione_id_2_url[id]})
                }
                info.granularity = 3
            }

            mapchart.change_state({
                t: "p",
                id: provincia_id
            });
        })
    } else if ($stateParams.comune_id !== undefined) {
        // comune
        $.when(dataloader.comune_prepare_urls, dataloader.provincia_prepare_parents, dataloader.comune_prepare_parents).done(function() {
            let comune_id = dataloader.comune_url_2_id[$stateParams.comune_id]
            info.location = dataloader.comune_id_2_name[comune_id].name_with_denomination

            if ($stateParams.g === undefined) {
                info.granularity = 3
            } else {
                var g = parseInt($stateParams.g)
                if (g < 2) {
                    $state.go("dashboard.italia")
                } else if (g < 3) {
                    var id = dataloader.provincia_parent[dataloader.comune_parent[comune_id]]
                    $state.go("dashboard.regione", {regione_id: dataloader.regione_id_2_url[id]})
                }
                info.granularity = g
            }

            mapchart.change_state({
                t: "c",
                id: comune_id
            });
        })
    } else {
        // italia
        info.location = "Italia"

        if ($stateParams.g === undefined) {
            info.granularity = 1
        } else {
            info.granularity = parseInt($stateParams.g)
        }

        mapchart.change_state({
            t: "i"
        });
    }
}])
