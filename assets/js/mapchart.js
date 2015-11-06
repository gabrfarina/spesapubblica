"use strict"

angular
.module("spesapubblica")
.factory("mapchart", ['$rootScope', '$state', 'info', 'dataloader', function($rootScope, $state, info, dataloader) {
    var me = {}

    /******************************************************************/
    /* DOM preparation                                                */
    /******************************************************************/

    $("#map")
        .height(window.innerHeight - 64 - 40*2);

    // TODO: this part can be called before _id_2_dom_<whatever> has been computed!
    $(window).resize(_.debounce(function(e) {
        $("#map")
            .width($("#map").parent().width())
            .height(window.innerHeight - 64 - 40*2);

        me._fit_to_viewport()
    }, 100))

    $rootScope.$watch(function() {
        return $("#map").width()
    }, function() {
        $(window).resize()
    })

    /******************************************************************/
    /* Constants                                                      */
    /******************************************************************/

    me._TRANSITION_DURATION = 500

    /******************************************************************/
    /* Members                                                        */
    /******************************************************************/

    me._data = {
        "type": "Topology",
        "objects": {},
        "arcs": {}
    };

    me.current_state = null

    // maps needed to implement dynamic dom manipulation
    me._id_2_dom_regione = {}
    me._id_2_dom_provincia = {}
    me._id_2_dom_comune = {}

    // html/svg-related stuff
    me._container = "#map";
    me._svg = null;
    me._g = null;

    // list of interesting IDs of stuff to report when coloring areas
    me._interesting = []

    // Bounds for Italy geometry
    me._italy_geometry = null;

    me._tooltip_container = "#map-tooltip";
    me._tooltip = d3.select(me._tooltip_container);

    // D3 related stuff
    me._zoom = d3.behavior.zoom()
            .scaleExtent([1, 15])
            .on('zoom', function() {
                var t = d3.event.translate;
                var s = d3.event.scale;

                me._zoom.translate(t);
                me._g.attr("transform", "translate(" + t + ")scale(" + s + ")");

                d3.selectAll(".region").style("stroke-width", 1/s);
                d3.selectAll(".province").style("stroke-width", .4/s);
                d3.selectAll(".comune").style("stroke-width", .25/s);
                d3.selectAll(".graticule").style("stroke-width", 1/s);
            });

    // D3 related stuff
    me._drag = d3.behavior.drag()
            .on('dragstart', function () {
                d3.event.sourceEvent.stopPropagation();
            });

    /******************************************************************/
    /* Methods                                                        */
    /******************************************************************/

    me._load_regions = function(callback) {
        if (me._data.objects.regions !== undefined) {
            callback()
        } else {
            d3.json("data/maps/italy-regions.json", function(error, data) {
                if (error)
                    throw(error);
                me._merge_objects(me._data, data)
                callback()
            });
        }
    }

    me._load_provinces = function(callback) {
        if (me._data.objects.provinces !== undefined) {
            callback()
        } else {
            d3.json("data/maps/italy-provinces.json", function(error, data) {
                if (error)
                    throw(error);
                me._merge_objects(me._data, data)
                callback()
            });
        }
    }

    me._load_comuni = function(callback) {
        if (me._data.objects.comuni !== undefined) {
            callback();
        } else {
            d3.json("data/maps/italy-comuni.json", function(error, data) {
                if (error)
                    throw(error);
                me._merge_objects(me._data, data)
                callback();
            });
        }
    }

    // this is needed because _.extend deletes stuff and _.merge (lodash) is too slow
    me._merge_objects = function(a, b) {
        if (typeof a === 'object' && typeof b === 'object') {
            _.each(b, function(value, key) {
                if (_.has(a, key)) {
                    me._merge_objects(a[key], value)
                } else {
                    a[key] = value
                }
            })
        }
    }

    me._show_tooltip = function(html) {
        me._tooltip.html("<span>" + html + "</span>");
        var tooltipW = $(me._tooltip.node()).width() + 2 * 10,      // 10 = padding-left/right
            tooltipH = $(me._tooltip.node()).height() + 2 * 5 + 7 + 4,  // 5  = padding-top/bottom; 7 = ::after height
            offsetL = $('#map').offset().left,
            offsetT = $('#map').offset().top;

        var mouse = d3.mouse(me._svg.node()).map( function(d) { return parseInt(d); } );

        me._tooltip.classed("hidden_t", false)
                .attr("style", "left:"+(mouse[0]+offsetL-tooltipW/2)+"px;top:"+(mouse[1]+offsetT-tooltipH)+"px");
    };

    me._hide_tooltip = function() {
        me._tooltip.classed("hidden_t", true);
    };

    me._fit_to_viewport = function() {
        me._width = $(me._container).width();
        me._height = $(me._container).height();

        me._svg.attr("width", me._width)
               .style("width", me._width)
               .attr("height", me._height)
               .style("height", me._height);

        me._focus_state(me.current_state);
    }

    me._init = function() {
        me._width = $(me._container).width();
        me._height = $(me._container).height();

        if (me._svg)
            $(me._container).remove('svg');

        // Create main DOM nodes
        me._svg = d3.select(me._container).append('svg')
                .attr("width", me._width)
                .attr("height", me._height);

        var defs = me._svg.append('defs')
        defs.append('pattern')
                .attr('id', 'pattern-stripe')
                .attr('width', '4')
                .attr('height', '4')
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('patternTransform', 'rotate(45)')
                .append('rect')
                        .attr('width', '3')
                        .attr('height', '4')
                        .attr('transform', 'translate(0,0)')
                        .attr('fill', 'white')
        defs.append('mask')
                .attr('id', 'mask-stripe')
                .append('rect')
                        .attr('x', '0')
                        .attr('y', '0')
                        .attr('width', '100%')
                        .attr('height', '100%')
                        .attr('fill', 'url(#pattern-stripe)')

        me._g = me._svg.append('g');

        me._graticule_g = me._g.append('g')
                .attr("id", "graticule");

        me._comuni_g = me._g.append('g')
                .attr("id", "comuni");

        me._provinces_g = me._g.append('g')
                .attr("id", "provinces");

        me._regions_g = me._g.append('g')
                .attr("id", "regions");

        me._svg
                .attr('width', me._width)
                .style('width', me._width)
                .attr('height', me._height)
                .style('height', me._height);

        // Create a unit projector
        me._projector = d3.geo.mercator()
            .scale(1)
            .translate([0, 0]);

        // Create a path generator
        me._path = d3.geo.path()
            .projection(me._projector);
        // FIXME: what is the line below?
        me._tooltip.on('mouseenter', me._hide_tooltip);

        me._create_regioni(function(regions) {
            // Compute the bounds of a feature of interest, then derive scale & translate.
            var b = me._path.bounds(regions),
                s = .98 / Math.max((b[1][0] - b[0][0]) / me._width, (b[1][1] - b[0][1]) / me._height),
                t = [(me._width - s * (b[1][0] + b[0][0])) / 2, (me._height - s * (b[1][1] + b[0][1])) / 2];

            me._italy_geometry = regions;

            // Update the projection to use computed scale & translate.
            me._projector
                .scale(s)
                .translate(t);

            // Create graticule
            var graticule = d3.geo.graticule()
                    .extent([[0, 30], [25, 55]]) // Only show some meridians / parallels
                    .step([2.5, 2.5]);

            // Draw graticule and equator (this is done before drawing the countries because of
            // the svg drawing order.
            // FIXME (2/8/15): This is *not* necessary, order is enforced by the groups. Move this code
            //         to a better place
            me._graticule_g.insert("path")
                    .attr("class", "graticule")
                    .attr("d", me._path(graticule()));
            // -- end of FIXME
        }, function(){})
    }

    me._focus_state = function(state) {
        switch (state.t) {
        case "r":
            me._focus(me._id_2_dom_regione[state.id].geometry, .75);
            break;
        case "p":
            me._focus(me._id_2_dom_provincia[state.id].geometry, .75);
            break;
        case "c":
            me._focus(me._id_2_dom_comune[state.id].geometry, .75);
            break;
        case "i":
            me._focus(me._italy_geometry, .92);
            break;
        default:
            break;
        }
    }

    me._focus = function(geometry, shrink_factor) {
        var bounds = me._path.bounds(geometry),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = shrink_factor / Math.max(dx / me._width, dy / me._height),
                translate = [me._width / 2 - scale * x, me._height / 2 - scale * y];

        me._svg.transition()
                .duration(me._TRANSITION_DURATION)
                .call(me._zoom.translate(translate).scale(scale).event);
    }

    // me._gray_out_regions = function(region_id) {
    //     return
    //     _.each(me._regions_g, function(node) {
    //         d3.select(node).style("fill", "gray")
    //     });
    // }

    me._create_regioni = function(first) {
        var promise = $.Deferred()
        var regioni_ids = []

        me._load_regions(function() {
            me._data.arcs.length = Object.keys(me._data.arcs).length
            var su = {
                regions: topojson.feature(me._data, me._data.objects.regions)
            };

            // callback
            if (first !== undefined) {
                first(su.regions)
            }

            var todo = su.regions.features.length
            var done = 0
            _.each(su.regions.features, function(feature) {
                regioni_ids.push(feature.properties.id)

                if (!me._id_2_dom_regione[feature.properties.id]) {

                    me._id_2_dom_regione[feature.properties.id] = {
                        "dom_node": me._regions_g.append("path")
                            .datum(feature)
                            .attr("class", "region")
                            .attr("d", me._path(feature))
                            .call(me._drag)
                            .on("click", function() {
                                // change URL
                                $state.go("dashboard.regione", {"regione_id": dataloader.regione_id_2_url[feature.properties.id]})
                            })
                            .on("mousemove", function() {
                                me._show_tooltip(dataloader.regione_id_2_name[feature.properties.id].name_with_denomination);
                            })
                            .on("mouseleave", function() {
                                me._hide_tooltip()
                            }),
                        "geometry": feature.geometry
                    }

                    // notify
                    done++
                    promise.notify(done / todo)
                }
            });

            promise.resolve(regioni_ids)
        })

        return promise
    }

    me._create_province = function(region_id) {
        var promise = $.Deferred()
        var province_ids = []

        // a region was clicked: download all provinces and then load the provinces in the specified region
        me._load_provinces(function() {

            var su = {
                provinces: topojson.feature(me._data, me._data.objects.provinces)
            };

            var todo = su.provinces.features.length
            var done = 0
            _.every(su.provinces.features, function(feature) {
                // only provinces in the region
                if (dataloader.provincia_parent[feature.properties.id] == region_id) {
                    province_ids.push(feature.properties.id)

                    if (!me._id_2_dom_provincia[feature.properties.id]) {

                        me._id_2_dom_provincia[feature.properties.id] = {
                            "dom_node": me._provinces_g.append("path")
                                .datum(feature)
                                .attr("class", "province")
                                .attr("d", me._path(feature))
                                .call(me._drag)
                                .on("click", function() {
                                    // change URL
                                    $state.go("dashboard.provincia", {"provincia_id": dataloader.provincia_id_2_url[feature.properties.id]})
                                })
                                .on("mousemove", function() {
                                    me._show_tooltip(dataloader.provincia_id_2_name[feature.properties.id].name_with_denomination);
                                })
                                .on("mouseleave", function() {
                                    me._hide_tooltip()
                                }),
                            "geometry": feature.geometry
                        }

                        // notify
                        done++
                        promise.notify(done / todo)
                    }
                }

                // if we are still supposed to do this, continue
                if (info.granularity >= 2); else {
                    console.error("Ehm... " + info.granularity + ">= 2")
                }
                return true
                return info.granularity >= 2
            });

            promise.resolve(province_ids)
        })

        return promise
    }

    me._create_comuni = function(provincia_id) {
        var promise = $.Deferred()
        var comune_ids = []

        me._load_comuni(function() {
            var su = {
                comuni: topojson.feature(me._data, me._data.objects.comuni)
            };

            var todo = su.comuni.features.length
            var done = 0
            _.every(su.comuni.features, function(feature) {
                // only comuni in the provincia (now it's the time of lunch)

                // FIXME: the + here is a temporary workaround (it should be parsed as int in layers.js)
                feature.properties.id = +feature.properties.id

                if (dataloader.comune_parent[feature.properties.id] == provincia_id) {
                    comune_ids.push(feature.properties.id)

                    if (!me._id_2_dom_comune[feature.properties.id]) {

                        me._id_2_dom_comune[feature.properties.id] = {
                            "dom_node": me._comuni_g.append("path")
                                .datum(feature.properties)
                                .attr("class", "comune")
                                .attr("d", me._path(feature))
                                .call(me._drag)
                                .on("click", function(d) {
                                    // change URL
                                    // FIXME: temporary + have to be removed (must be fixed in layers.js)
                                    $state.go("dashboard.comune", {"comune_id": dataloader.comune_id_2_url[+d.id]})
                                })
                                .on("mousemove", function(d) {
                                    me._show_tooltip(dataloader.comune_id_2_name[d.id].name_with_denomination);
                                })
                                .on("mouseleave", function(d) {
                                    me._hide_tooltip()
                                }),
                            "geometry": feature.geometry
                        }

                        // notify
                        done++
                        promise.notify(done / todo)
                    }
                }

                // if we are still supposed to do this, continue
                if (info.granularity >= 3); else {
                    console.error("Ehm... " + info.granularity + ">= 3")
                }
                return true
                return info.granularity >= 3
            });

            promise.resolve(comune_ids)
        })

        return promise
    }

    me._remove_province = function(province_id) {
        if (me._id_2_dom_provincia[province_id]) {
            me._id_2_dom_provincia[province_id].dom_node.remove();
            delete me._id_2_dom_provincia[province_id];

            // console.log("Removed province " + province_id + " (" + dataloader.provincia_id_2_name[province_id].name + ")");
            if (me._id_2_dom_provincia[province_id])
                throw province_id;
        }
    };

    me._remove_comune = function(comune_id) {
        if (me._id_2_dom_comune[comune_id]) {
            me._id_2_dom_comune[comune_id].dom_node.remove();
            delete me._id_2_dom_comune[comune_id];
        }
    };

    me._get_parent_state = function(state) {
        switch (state.t) {
        case "c":
            return {
                t: "p",
                id: dataloader.comune_parent[state.id]
            }
        case "p":
            return {
                t: "r",
                id: dataloader.provincia_parent[state.id]
            }
        default:
            return {
                t: "i"
            }
        }
    }

    me.reload_state = function() {
        me.change_state(me.current_state)
    }

    /* Change state

    new_state is an object which can have two properties:
      - t: type of the state, possible values:
            * "i" = italia
            * "r" = regione
            * "p" = provincia
            * "c" = comune
      - id: id of the state
    */
    me.change_state = function(new_state) {
        // TODO(later): fare in modo che avvenga una transizione, che non faccia "sparire" le cose eliminate
        var parent_state, parent_parent_state

        if (new_state.t === "i") {
            $("#reset-button").hide()
        } else {
            $("#reset-button").show()
        }

        switch (new_state.t) {
        case "i":
            // TODO 1: elimina tutte le province (+figli) dal DOM
            //   NOTE (2/8/15): skip TODO 1
            // TODO 2: resetta lo zoom a tutta la mappa

            //$(".region").show()

            // Create regions (always needed)
            me._create_regioni().done(function(r_ids) {
                // 1
                $(".province").remove()
                me._id_2_dom_provincia = {}
                $(".comune").remove()
                me._id_2_dom_comune = {}
                // 2
                me._focus_state(new_state)

                if (info.granularity > 1) {
                    var province_promises = []
                    var comuni_promises = []

                    // load province
                    for (var i in r_ids) {
                        var promise = me._create_province(r_ids[i])
                        province_promises.push(promise)
                        if (info.granularity > 2) {
                            promise.done(function(p_ids) {
                                for (var i in p_ids) {
                                    // load comuni
                                    comuni_promises.push(me._create_comuni(p_ids[i]))
                                }
                            })
                        }
                    }

                    $.when.apply($, province_promises).done(function() {
                        if (info.granularity > 2) {
                            $.when.apply($, comuni_promises).done(function() {
                                // colorize comuni
                                me._default_restyle(3)
                            })
                        } else {
                            // colorize province
                            me._default_restyle(2)
                        }
                    })
                } else {
                    // colorize regioni
                    me._default_restyle(1)
                }
            })

            break
        case "r":
            // TODO 1: elimina province (+figli) eccetto quelle della regione new_state.id
            // TODO 2: elimina (se necessario) i figli delle province della regione new_state.id
            // TODO 3: crea (se necessario) le province della regione new_state.id
            // TODO 4: zoom nella regione new_state.id

            // 1+2+3
            d3.selectAll(".comune").each(function(d) {
                me._remove_comune(d.id)
            })

            d3.selectAll(".province").each(function(d) {
                if (dataloader.provincia_parent[d.properties.id] != new_state.id) {
                    me._remove_province(d.properties.id);
                }
            });

            // old version
            // $(".province").remove()
            // me._id_2_dom_provincia = {}
            // $(".comune").remove()
            // me._id_2_dom_comune = {}

            var promise = me._create_province(new_state.id)
            var comuni_promises = []

            var loaded = $.Deferred()

            // TODO: check what happens below if the granularity suddenly changes

            promise.done(function(p_ids) {
                if (info.granularity > 2) {
                    for (var i in p_ids) {
                        comuni_promises.push(me._create_comuni(p_ids[i]))
                    }

                    $.when.apply($, comuni_promises).done(function() {
                        loaded.resolve()
                    })
                } else {
                    loaded.resolve()
                }
            })

            loaded.done(function() {
                // 4
                me._focus_state(new_state)

                // colorize
                me._default_restyle(info.granularity)

                // grey out regions
                $(".region").css("fill", "gray")
                // make the interesting region transparent
                $(me._id_2_dom_regione[new_state.id].dom_node[0]).css("fill", "none")
            })

            break
        case "p":
            // TODO 1: trova la regione R che contiene la provincia new_state.id
            // TODO 2: elimina province eccetto quelle della regione R
            // TODO 3: crea (se necessario) le province della regione R
            // TODO 4: crea (se necessario) i comuni della provincia new_state.id
            // TODO 5: zoom nella provincia new_state.id

            // 1
            parent_state = me._get_parent_state(new_state)

            // 2+3
            // FIXME: most of the time it's not necessary to remove all provinces, we should exploit the case when we have the provinces already loaded
            //        (it's necessary if you reach another province via URL, while you're on a completely different region)
            //        (it's not necessary if you click on a province, since all the provinces in that region have been loaded)
            //        maybe it should be done on case "r" also, but it's very rare that a user enters a region with the provinces already loaded
            // NOTE (2/8/15): I think I have fixed it. If you agree, just delete FIXME + this NOTE. The old code is down here for reference:
            //        $(".province").remove()

            d3.selectAll(".province").each(function(d) {
                if (dataloader.provincia_parent[d.properties.id] != parent_state.id) {
                    me._remove_province(d.properties.id);
                }
            });

            me._create_province(parent_state.id).done(function() {
                // 4
                d3.selectAll(".comune").each(function(d) {
                    if (dataloader.comune_parent[d.id] != new_state.id) {
                        me._remove_comune(d.id);
                    }
                });

                me._create_comuni(new_state.id).done(function() {
                    // 5
                    me._focus_state(new_state)

                    // colorize comuni
                    me._default_restyle(3)

                    // grey out stuff
                    $(".region, .province").css("fill", "gray")

                    // leave a "hole" in the interesting region + province
                    $(me._id_2_dom_regione[parent_state.id].dom_node[0]).css("fill", "none")
                    $(me._id_2_dom_provincia[new_state.id].dom_node[0]).css("fill", "none")
                })
            })

            break
        case "c":
            // TODO 1: trova la provincia P che contiene il comune new_state.id
            // TODO 2: trova la regione R che contiene la provincia P
            // TODO 3: elimina province eccetto quelle della regione R
            // TODO 4: crea (se necessario) le province della regione R
            // TODO 5: elimina comuni eccetto quelli della provincia P
            // TODO 6: crea (se necessario) i comuni della provincia P
            // TODO 7: zoom nel comune new_state.id

            // 1
            parent_state = me._get_parent_state(new_state)
            // 2
            parent_parent_state = me._get_parent_state(parent_state)

            // 3+4
            // NOTE (2/8/15): see above
            d3.selectAll(".province").each(function(d) {
                if (dataloader.provincia_parent[d.id] != parent_parent_state.id)
                    me._remove_province(d.id);
            });

            me._create_province(parent_parent_state.id).done(function() {
                // 5+6

                // NOTE (2/8/15): see above. Old code down here:
                //        $(".comune").remove()
                d3.selectAll(".comune").each(function(d) {
                    if (dataloader.comune_parent[d.id] != parent_state.id)
                        me._remove_comune(d.id);
                });

                me._create_comuni(parent_state.id).done(function() {
                    // 7
                    me._focus_state(new_state)

                    // colorize comuni
                    me._default_restyle(3)

                    $(".region, .province")
                        .css("fill", "gray")

                    // leave a "hole" in the interesting region + province
                    $(me._id_2_dom_regione[parent_parent_state.id].dom_node[0]).css("fill", "none")
                    $(me._id_2_dom_provincia[parent_state.id].dom_node[0]).css("fill", "none")
                })
            })

            break
        }

        me.current_state = new_state
    }


    me.change_to_parent_state = function() {
        var p = me._get_parent_state(me.current_state)
        switch (p.t) {
        case "i":
            $state.go("dashboard.italia")
            break
        case "r":
            $state.go("dashboard.regione", {"regione_id": dataloader.regione_id_2_url[p.id]})
            break
        case "p":
            $state.go("dashboard.provincia", {"provincia_id": dataloader.provincia_id_2_url[p.id]})
            break
        case "c":
            $state.go("dashboard.comune", {"comune_id": dataloader.comune_id_2_url[p.id]})
            break
        }
    }


    me._default_restyle = function(granularity) {
        var s = me._zoom.scale();

        $(me._svg.node()).find('.region')
                .css('fill', 'none')
                .css('stroke', 'white')
                .css('stroke-width', 1/s);
        $(me._svg.node()).find('.province')
                .css('fill', 'none')
                .css('stroke', 'white')
                .css('stroke-width', .6/Math.sqrt(s));
        $(me._svg.node()).find('.comune')
                .css('fill', 'none')
                .css('stroke', 'white')
                .css('stroke-width', .4/Math.sqrt(s));

        $(".region, .province, .comune")
            .on('mousemove', function() {
                $(this).css("opacity", "0.7");
            })
            .on('mouseleave', function() {
                var that = this;
                setTimeout(function() {
                    $(that).css("opacity", "1");
                }, 50);
            });

        me.update_colors(granularity)
    };

    me.update_colors = function(granularity) {
        console.log("Multiple: " + info.multiple_selection)
        if (info.multiple_selection) {
            if (info.selected_categories.length > 0) {
                me.interesting = info.selected_categories
            } else {
                return  // check this case
            }
        } else {
            me.interesting = [info.radio_selected]
        }

        console.log(JSON.stringify(me.interesting))

        dataloader.prepare_reports.done(function() {
            if (granularity == 3) {
                me._style_comuni();
            } else if (granularity == 2) {
                me._style_provinces();
            } else if (granularity == 1) {
                me._style_regions();
            }
        })
    }

    var rnd_color = function() {
        return "hsl(" + Math.floor(240 - Math.random() * 60) + ",80%,40%)";
    }

    me._aggregate_data = function(datatype, id, expenses) {
        var s = 0;
        for (var i in expenses) {
            if (dataloader["_" + datatype + "_report"].hasOwnProperty(id)
                    && dataloader["_" + datatype + "_report"][id].hasOwnProperty(expenses[i]))
                s += parseFloat(dataloader["_" + datatype + "_report"][id][expenses[i]]);
            else
                return -1;
        }
        return s;
    }

    me._interpolate_color = function(value, mean, margin) {
        var hue = 0, saturation = "70%", lightness = "50%";

        if (margin == 0) margin = .1;

        var hue_high = 0, hue_low = 120;

        if (value < mean - margin) hue = hue_low, saturation = "100%", lightness = "60%";
        else if (value > mean + margin) hue = hue_high, saturation = "100%", lightness = "60%";
        else hue = Math.min(hue_low, hue_high) + Math.abs(hue_high - hue_low) * (1 - (value - mean + margin) / (2 * margin));

        return "hsl(" + hue + "," + saturation + "," + lightness + ")";
    }

    me._style_comuni = function() {
        me._pie_data.rows = []  // clear

        var totals = Array.apply(null, Array(info.num_categories + 1)).map(Number.prototype.valueOf, 0)  // in ES6: new Array(size).fill(0)

        var expenses = []
        d3.selectAll(".comune").each(function(d) {
            var expense = me._aggregate_data("comune", d.id, me.interesting)
            if (expense > 0)
                expenses.push(expense);

            for (var i=1; i<=info.num_categories; i++) {
                var tmp = me._aggregate_data("comune", d.id, [i])
                if (tmp > 0) {
                    totals[i] += tmp
                }
            }
        })

        for (var i=1; i<=info.num_categories; i++) {
            me._pie_data.rows.push({
                c: [
                    {v: info.category_id_2_label[i]},
                    {v: totals[i]}
                ]
            })
        }

        var mean = math.mean(expenses);
        var std = math.std(expenses);
        var margin = Math.min(mean, 3.0 * std);
        d3.selectAll(".comune").each(function(d) {
            var expense = me._aggregate_data("comune", d.id, me.interesting)
            // console.log("Comune " + d.id + ": " + expense);

            if (expense > 0)
                d3.select(this).style("fill", me._interpolate_color(expense, mean, margin));
            else
                d3.select(this).style("fill", "rgb(145, 145, 145)");
        });
    }

    me._style_provinces = function() {
        me._pie_data.rows = []  // clear

        var expenses = []
        _.each(dataloader._provincia_report, function(v, province_id) {
            var expense = me._aggregate_data("provincia", province_id, me.interesting)
            if (expense > 0)
                expenses.push(expense)
        })

        var mean = math.mean(expenses);
        var std = math.std(expenses);
        var margin = Math.min(mean, 3.0 * std);

        var totals = Array.apply(null, Array(info.num_categories + 1)).map(Number.prototype.valueOf, 0)  // in ES6: new Array(size).fill(0)

        d3.selectAll(".province").each(function(d) {
            var expense = me._aggregate_data("provincia", d.properties.id, me.interesting)
            // console.log("Provincia " + d.properties.id + ": " + expense);

            if (expense > 0)
                d3.select(this).style("fill", me._interpolate_color(expense, mean, margin));
            else
                d3.select(this).style("fill", "rgb(145, 145, 145)");

            for (var i=1; i<=info.num_categories; i++) {
                var tmp = me._aggregate_data("provincia", d.properties.id, [i])
                if (tmp > 0) {
                    totals[i] += tmp
                }
            }
        })

        for (var i=1; i<=info.num_categories; i++) {
            me._pie_data.rows.push({
                c: [
                    {v: info.category_id_2_label[i]},
                    {v: totals[i]}
                ]
            })
        }
    }

    me._style_regions = function() {
        me._pie_data.rows = []  // clear

        var expenses = []
        _.each(dataloader._regione_report, function(v, region_id) {
            var expense = me._aggregate_data("regione", region_id, me.interesting)
            if (expense > 0)
                expenses.push(expense)
        })

        var mean = math.mean(expenses);
        var std = math.std(expenses);
        var margin = Math.min(mean, 3.0 * std);

        var totals = Array.apply(null, Array(info.num_categories + 1)).map(Number.prototype.valueOf, 0)  // in ES6: new Array(size).fill(0)

        d3.selectAll(".region").each(function(d) {
            var expense = me._aggregate_data("regione", d.properties.id, me.interesting)
            // console.log("Regione " + d.properties.id + ": " + expense);

            if (expense > 0)
                d3.select(this).style("fill", me._interpolate_color(expense, mean, margin));
            else
                d3.select(this).style("fill", "rgb(145, 145, 145)");

            for (var i=1; i<=info.num_categories; i++) {
                var tmp = me._aggregate_data("regione", d.properties.id, [i])
                if (tmp > 0) {
                    totals[i] += tmp
                }
            }
        })

        for (var i=1; i<=info.num_categories; i++) {
            me._pie_data.rows.push({
                c: [
                    {v: info.category_id_2_label[i]},
                    {v: totals[i]}
                ]
            })
        }
    }

    /******************************************************************/
    /* Constructor code                                               */
    /******************************************************************/

    me._init();

    return me
}])
