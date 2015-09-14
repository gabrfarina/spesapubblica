"use strict"

angular
.module("spesapubblica")
.factory("info", [function() {
    var service = {}

    service.granularity = 1
    service.search_text = ""
    service.selected_item = {}
    service.radio_selected = "1"
    service.multiple_selection = false
    service.selected_categories = [
        service.radio_selected
    ]

    return service
}])
