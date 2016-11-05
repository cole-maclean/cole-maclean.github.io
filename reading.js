d3.select(".home-feature-image").append("div")
    .attr("class","viz-title")
    .html("<br/>" + " What I'm Reading" + "<br/>" + " Tagged Web Media" + "</br/>")

//these are the various datetime parser for each level of data resolution
parseHourly = d3.time.format("%Y-%m-%dT%H").parse
parseDaily = d3.time.format("%Y-%m-%d").parse
parseMonthly = d3.time.format("%Y-%m").parse
parseYearly = d3.time.format("%Y").parse

//margins for data viz spacings
var margin = {top: 20, right: 20, bottom: 20, left: 120, tag: 20,legend:250},
    width = 1460 - margin.left - margin.right;

var legend_color = d3.scale.category10(); //color scale for unique legend item

var height = 460,
    navHeight = 100 + margin.top + margin.bottom;

//maximum number of unique commit tags to display
var max_tags = 20;

//the resolution dict holds the functions required to update the graphic scales at each resolution class, stored in an array with:
// 0-datetime parser, 1 - top level graphic tick intervals, 2 - bottom level (nav) tick intervals, 3 - default days to offset for original draw
var pocket_resolution_dict = { "daily":[parseDaily,[d3.time.days,3],[d3.time.months,1],-21],
                        "monthly":[parseMonthly,[d3.time.months,1],[d3.time.months,1],-180],
                        "yearly":[parseYearly,[d3.time.years,1],[d3.time.years,1],-1000]};

//build date resolution dropdown selection menu
var select = d3.select(".home-feature-image")
  .append('select')
    .attr('class','pocket_select')
    .on('change',pocket_onchange)

var options = select
  .selectAll('option')
    .data(d3.keys(pocket_resolution_dict)).enter()
    .append('option')
    .text(function (d) {return d; });

//main dataviz svg to attach objects to. svg made responsive to support different screen resolutions, all subsequent attached objects scale similarially
var pocket_svg = d3.select(".home-feature-image")
    .append("div")
    .classed("svg-container", true)
    .style("padding-bottom", (height+navHeight)/width*100 + "%") /* aspect ratio */
    .append("svg")
    .attr("id","pocket_svg")
    .attr("viewBox","0 0 1503 " + (height+navHeight))
    .attr("perserveAspectRatio","xMinYMid")
    .classed("svg-content-responsive", true);

function pocket_onchange() {
    //redraw viz with new resolution
    d3.json("pocket_tag_tuples.json",function(data) {
                                    initial_draw(data,pocket_svg,d3.select('.pocket_select').property('value'),pocket_resolution_dict);
                                });
};
d3.json("pocket_tag_tuples.json",function(data) {
                                    initial_draw(data,pocket_svg,d3.select('.pocket_select').property('value'),pocket_resolution_dict);
                                });

