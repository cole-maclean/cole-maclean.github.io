d3.select(".home-feature-image").append("div")
    .attr("class","viz-title")
    .html("<br/>" + " What I'm Working On" + "<br/>" + " Tagged Github Commits" + "</br/>")

//these are the various datetime parser for each level of data resolution
parseHourly = d3.time.format("%Y-%m-%dT%H").parse
parseDaily = d3.time.format("%Y-%m-%d").parse
parseMonthly = d3.time.format("%Y-%m").parse
parseYearly = d3.time.format("%Y").parse

//margins for data viz spacings
var margin = {top: 20, right: 20, bottom: 20, left: 120, tag: 20,legend:200},
    width = 1503 - margin.left - margin.right;

var legend_color = d3.scale.category10(); //color scale for unique legend item

var height = 460,
    navHeight = 100 + margin.top + margin.bottom;

//maximum number of unique commit tags to display
var max_tags = 20;

//the resolution dict holds the functions required to update the graphic scales at each resolution class, stored in an array with:
// 0-datetime parser, 1 - top level graphic tick intervals, 2 - bottom level (nav) tick intervals, 3 - default days to offset for original draw
var github_resolution_dict = {"hourly":[parseHourly,[d3.time.hours,6],[d3.time.days,1],-7],
                        "daily":[parseDaily,[d3.time.days,1],[d3.time.weeks,1],-21],
                        "monthly":[parseMonthly,[d3.time.months,1],[d3.time.years,1],-180],
                        "yearly":[parseYearly,[d3.time.years,1],[d3.time.years,1],-1000]};

//build date resolution dropdown selection menu
var select = d3.select(".home-feature-image")
  .append('select')
    .attr('class','github_select')
    .on('change',github_onchange)

var options = select
  .selectAll('option')
    .data(d3.keys(github_resolution_dict)).enter()
    .append('option')
    .text(function (d) {return d; });

//main dataviz svg to attach objects to. svg made responsive to support different screen resolutions, all subsequent attached objects scale similarially
var github_svg = d3.select(".home-feature-image")
    .append("div")
    .classed("svg-container", true)
    .style("padding-bottom", (height+navHeight)/width*100 + "%") /* aspect ratio */
    .append("svg")
    .attr("id","github_svg")
    .attr("viewBox","0 0 1503 " + (height+navHeight))
    .attr("perserveAspectRatio","xMinYMid")
    .classed("svg-content-responsive", true);

function github_onchange() {
    //redraw viz with new resolution
    d3.json("commit_tag_tuples.json",function(data) {
                                    initial_draw(data,github_svg,d3.select('.github_select').property('value'),github_resolution_dict);
                                });
};
d3.json("commit_tag_tuples.json",function(data) {
                                    initial_draw(data,github_svg,d3.select('.github_select').property('value'),github_resolution_dict);
                                });