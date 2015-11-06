"use strict"

angular
.module("spesapubblica")
.factory("info", [function() {
    console.log("caricato info")
    var service = {}

    service.num_categories = 19
    service.category_id_2_label = {}
    service.granularity = 1
    service.search_text = null
    service.selected_item = null
    service.radio_selected = "1"
    service.multiple_selection = false
    service.selected_categories = [
        service.radio_selected
    ]

    service.select_all = function() {
        service.multiple_selection = true
        service.selected_categories = []
        for (var i=1; i<=service.num_categories; i++) {
            service.selected_categories.push("" + i)
            service.checkboxes[i-1].value = true
        }

        service.update_map()
    }

    // FIXME: right now, you must click 2 times for this to work
    service.select = function(item) {
        //service.selected_categories.clear()
        while (service.selected_categories.pop()) {}

        service.selected_categories.push(item)

        service.update_map()
    }

    service.toggle = function(item) {
        var idx = service.selected_categories.indexOf(item)
        if (idx > -1) service.selected_categories.splice(idx, 1)
        else service.selected_categories.push(item)

        service.update_map()
    }

    service.exists = function(item) {
        return service.selected_categories.indexOf(item) > -1
    }

    return service
}])
