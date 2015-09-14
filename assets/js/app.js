"use strict"

angular
.module("spesapubblica", ["ngMaterial", "ui.router"])
.config(function($mdThemingProvider, $mdIconProvider, $locationProvider, $stateProvider, $urlRouterProvider) {
    // Set up icons
    $mdIconProvider.defaultIconSet("./assets/svg/avatars.svg", 128)
        .icon("menu"        , "./assets/svg/menu.svg"        , 24)
        .icon("close"       , "./assets/svg/close.svg"       , 24)
        .icon("share"       , "./assets/svg/share.svg"       , 24)
        .icon("assessment"  , "./assets/svg/assessment.svg"  , 24)
        .icon("google_plus" , "./assets/svg/google_plus.svg" , 512)
        .icon("hangouts"    , "./assets/svg/hangouts.svg"    , 512)
        .icon("twitter"     , "./assets/svg/twitter.svg"     , 512)
        .icon("phone"       , "./assets/svg/phone.svg"       , 512);

    // Set up theme
    $mdThemingProvider.theme('default')
        .primaryPalette('blue')
        .accentPalette('grey');

    // Set up routing
    $locationProvider.html5Mode(false)
    $urlRouterProvider.otherwise("/italia")

    $stateProvider
        .state("dashboard", {
            templateUrl: "assets/html/dashboard.html",
            controller: "dashboard_ctrl"
        })
        .state("dashboard.italia", {
            url: "/italia?g",
            templateUrl: "assets/html/graph.html",
            controller: "graph_ctrl"
        })
        .state("dashboard.regione", {
            url: "/regione/{regione_id}?g",
            templateUrl: "assets/html/graph.html",
            controller: "graph_ctrl"
        })
        .state("dashboard.provincia", {
            url: "/provincia/{provincia_id}?g",
            templateUrl: "assets/html/graph.html",
            controller: "graph_ctrl"
        })
        .state("dashboard.comune", {
            url: "/comune/{comune_id}?g",
            templateUrl: "assets/html/graph.html",
            controller: "graph_ctrl"
        });
})
