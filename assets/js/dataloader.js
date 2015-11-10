"use strict"

angular
.module("spesapubblica")
.factory("dataloader", ['info', function(info) {
    var service = {
        checkboxes: []
    }

    function name_2_url(obj) {
        let result = {}

        function fix(s) {
            let res = ""

            for (let i in s) {
                if (s[i] == " ") {
                    res += "-"
                } else {
                    res += s[i].toLowerCase()
                }
            }

            return res
        }

        for (let key in obj) {
            result[key] = fix(obj[key])
        }

        return result
    }

    function invert_dictionary(dictionary) {
        let result = {}

        for (let key in dictionary) {
            result[dictionary[key]] = key
        }

        return result
    }

    function add_denomination(denomination, name) {
        return denomination + name;
    }

    function add_denomination_to_dictionary(denomination, dict) {
        var out_dict = {};
        for (let i in dict) {
            out_dict[i] = {
                name: dict[i],
                name_with_denomination: add_denomination(denomination, dict[i])
            };
        }
        return out_dict;
    }

    function url_preparator(json_path, what, denomination) {
        var promise = $.Deferred(function() {
            d3.json(json_path, function(error, data) {
                if (error) throw(error);

                let data_url = name_2_url(data)
                service[what + "_url_2_id"] = invert_dictionary(data_url)
                service[what + "_name_2_id"] = invert_dictionary(data)

                service[what + "_id_2_name"] = add_denomination_to_dictionary(denomination, data);
                service[what + "_id_2_url"] = data_url

                promise.resolve()
            })
        })

        return promise
    }

    service.regione_prepare_urls = url_preparator("data/names/regioni.json", "regione", "Regione ")
    service.provincia_prepare_urls = url_preparator("data/names/province.json", "provincia", "Provincia di ")
    service.comune_prepare_urls = url_preparator("data/names/comuni.json", "comune", "Comune di ")

    function parent_preparator(json_path, what) {
        var promise = $.Deferred(function() {
            d3.json(json_path, function(error, data) {
                if (error) throw(error);

                service[what + "_parent"] = data

                promise.resolve()
            })
        })

        return promise
    }

    service.provincia_prepare_parents = parent_preparator("data/parents/province.json", "provincia")
    service.comune_prepare_parents = parent_preparator("data/parents/comuni.json", "comune")

    service.prepare_prepare_reports = function() {
        service.prepare_reports = $.Deferred(function() {
            d3.json("data/reports/" + info.selected_year + ".json", function(error, data) {
                if (error) throw(error);

                service._comune_report = {};
                service._provincia_report = {};
                service._regione_report = {};

                $.when(
                    service.comune_prepare_parents,
                    service.provincia_prepare_parents
                ).done(function() {
                    _.each(data['data'], function(expenses, comune_id) {
                        var provincia_id = service.comune_parent[comune_id];
                        var regione_id = service.provincia_parent[provincia_id];

                        for (var expense_category in expenses) {
                            if (!service._comune_report.hasOwnProperty(comune_id))
                                service._comune_report[comune_id] = {};
                            service._comune_report[comune_id][parseInt(expense_category) + 1] = parseFloat(expenses[expense_category]);
                        }

                        for (var expense_category in expenses) {
                            if (!service._provincia_report.hasOwnProperty(provincia_id))
                                service._provincia_report[provincia_id] = {};
                            if (!service._provincia_report[provincia_id].hasOwnProperty(parseInt(expense_category) + 1))
                                service._provincia_report[provincia_id][parseInt(expense_category) + 1] = 0;
                            service._provincia_report[provincia_id][parseInt(expense_category) + 1] += parseFloat(expenses[expense_category]);
                        }

                        for (var expense_category in expenses) {
                            if (!service._regione_report.hasOwnProperty(regione_id))
                                service._regione_report[regione_id] = {};
                            if (!service._regione_report[regione_id].hasOwnProperty(parseInt(expense_category) + 1))
                                service._regione_report[regione_id][parseInt(expense_category) + 1] = 0;
                            service._regione_report[regione_id][parseInt(expense_category) + 1] += parseFloat(expenses[expense_category]);
                        }
                    });

                    _.each(data['legend'], function(category_name, category_id) {
                        service.checkboxes.push({
                            label: category_name,
                            id: category_id,
                            value: false
                        })

                        info.category_id_2_label[category_id] = category_name
                    })

                    service.prepare_reports.resolve();
                });
            });
        });
    }

    service.prepare_prepare_reports()  // load default year

    return service
}])
