"use strict"

angular
.module("spesapubblica")
.controller("dashboard_ctrl", [
        "$scope", "$state", "$mdDialog", "mapchart", "info", "dataloader",
        function($scope, $state, $mdDialog, mapchart, info, dataloader) {
    // maybe this could be done in a better way
    dataloader.prepare_reports.done(function() {
        info.checkboxes = dataloader.checkboxes
        info.update_map = function() {
            mapchart.update_colors(info.granularity)
        }
        $scope.$apply()
    })

    $scope.chartObject = {};

    $scope.chartObject.type = "PieChart";
    $scope.chartObject.data = {
        "cols": [
            {id: "t", label: "Tipo di spesa", type: "string"},
            {id: "s", label: "Valore della spesa", type: "number"}
        ],
        "rows": []
    }

    $scope.chartObject.options = {
        // 'title': 'How Much Pizza I Ate Last Night'
    }

    // make the pie available to mapchart
    mapchart._pie_data = $scope.chartObject.data

    // make info stuff available to the template
    $scope.info = info

    $scope.open_tutorial = $scope.open_authors = function(ev) {
        $mdDialog.show({
//            controller: DialogController,
            templateUrl: 'assets/html/tutorial.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose:true
        }).then(function(answer) {
            $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            $scope.status = 'You cancelled the dialog.';
        });
    }

    $scope.update_granularity = function(new_granularity) {
        info.granularity = new_granularity

        // minor fix (to avoid displaying a redundant ?g=x in the url)
        if (($state.current.name === "dashboard.italia" && new_granularity === 1)
                || ($state.current.name === "dashboard.regione" && new_granularity === 2)
                || ($state.current.name === "dashboard.provincia" && new_granularity === 3)
                || ($state.current.name === "dashboard.comune" && new_granularity === 3)) {
            // setting it to null causes to not display it
            new_granularity = null
        }

        $state.go(".", {g: new_granularity})
    }

    $scope.get_matches = function(text) {
        function add_results_from_dictionary(dictionary, results, type, limit) {
            var added = 0;
            for (let i in dictionary) {
                if (added == limit)
                    return;

                if (dictionary[i].name_with_denomination.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
                    results.push({
                        "display": dictionary[i].name_with_denomination,
                        "t": type,
                        "id": i
                    });
                    added += 1
                }
            }
        }

        let results = []
        add_results_from_dictionary(dataloader.regione_id_2_name, results, "r", 10)
        add_results_from_dictionary(dataloader.provincia_id_2_name, results, "p", 10)
        add_results_from_dictionary(dataloader.comune_id_2_name, results, "c", 10)

        return results
    }

    $scope.go_to_searched = function() {
        if (!info.selected_item) {
            console.log("info.selected_item is invalid")
            return
        }
        console.log("info.selected_item is valid")
        switch (info.selected_item.t) {
        case "r":
            $state.go("dashboard.regione", {regione_id: dataloader.regione_id_2_url[info.selected_item.id]})
            break
        case "p":
            $state.go("dashboard.provincia", {provincia_id: dataloader.provincia_id_2_url[info.selected_item.id]})
            break
        case "c":
            $state.go("dashboard.comune", {comune_id: dataloader.comune_id_2_url[info.selected_item.id]})
        }
    }

    $scope.go_to_parent = function() {
        mapchart.change_to_parent_state()
    }
}])
