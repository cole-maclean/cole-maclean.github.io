//these are the various datetime parser for each level of data resolution
parseHourly = d3.time.format("%Y-%m-%dT%H").parse
parseDaily = d3.time.format("%Y-%m-%d").parse
parseMonthly = d3.time.format("%Y-%m").parse
parseYearly = d3.time.format("%Y").parse

//margins for data viz spacings
var margin = {top: 20, right: 20, bottom: 20, left: 90, commit_tags: 20,repos:100},
    width = 1503 - margin.left - margin.right;

var repo_color = d3.scale.category10(); //color scale for unique repos

var github_height = 460,
    navHeight = 100 + margin.top + margin.bottom;

//maximum number of unique commit tags to display
var max_tags = 25;

//the resolution dict holds the functions required to update the graphic scales at each resolution class, stored in an array with:
// 0-datetime parser, 1 - top level graphic tick intervals, 2 - bottom level (nav) tick intervals, 3 - default days to offset for original draw
var resolution_dict = {"hourly":[parseHourly,[d3.time.hours,6],d3.time.days,-7],
                        "daily":[parseDaily,[d3.time.days,1],d3.time.weeks,-21],
                        "monthly":[parseMonthly,[d3.time.months,1],d3.time.years,-180],
                        "yearly":[parseYearly,[d3.time.years,1],d3.time.years,-1000]};

//build date resolution dropdown selection menu
var select = d3.select(".home-feature-image")
  .append('select')
    .attr('class','select')
    .on('change',onchange)

var options = select
  .selectAll('option')
    .data(d3.keys(resolution_dict)).enter()
    .append('option')
    .text(function (d) {return d; });

function onchange() {
    //redraw viz with new resolution
    d3.json("commit_tag_tuples.json",initial_github_draw)
};

//main dataviz svg to attach objects to. svg made responsive to support different screen resolutions, all subsequent attached objects scale similarially
var github_svg = d3.select(".home-feature-image")
    .append("div")
    .classed("svg-container", true)
    .style("padding-bottom", (github_height+navHeight)/width*100 + "%") /* aspect ratio */
    .append("svg")
    .attr("id","github_svg")
    .attr("viewBox","0 0 1503 " + (github_height+navHeight))
    .attr("perserveAspectRatio","xMinYMid")
    .classed("svg-content-responsive", true);


function initial_github_draw(github_data){

	var resolution = d3.select('select').property('value') //user selected date resolution from dropdown menu
	var commit_data = github_data[resolution] //github_data is a dictionary of commit_data tuples summarized and keyed by hour, day, month and year
	commit_data.forEach(function(d){
        d[0] = resolution_dict[resolution][0](d[0]); //this parses the string date data into the proper date format using the respective resolution level parser
    });

    var maxDate = d3.max(commit_data, function (d) { return d[0]; }); //max date in data set
    var minDate = Math.max(d3.min(commit_data, function (d) { return d[0]; }),d3.time.day.offset(maxDate, resolution_dict[resolution][3])); //minDate is selected as the max date that results from either the min date 
                                                                                                                                            //in the dataset, 
                                                                                                                                           //or offseting by the default offset days in the resolution dict 
 	var xScale = d3.time.scale().range([0, width]) //this is the x-axis scalled by commit dates
        .domain([minDate,maxDate]);

    var xAxis = d3.svg.axis()
	.scale(xScale)
	.orient("top")
	.ticks(resolution_dict[resolution][1][0],resolution_dict[resolution][1][1]); //ticks updated by the top level tick interval stored in the resolution dictionary for each respective resolution

    d3.select(".x.axis").remove();
	github_svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.call(xAxis); //adds x-date axis on top of svg

    draw_github(commit_data,xScale)
    draw_navChart(commit_data,xScale,xAxis)

}
//base viz modified from http://neuralengr.com/asifr/journals/
function draw_github(commit_data,xScale){
    //commit_data is list of tuples in form (with index) [0-timestamp,1-repo,2-tag,3-count]
    //data is filtered between the date interval selected in the nav chart
	commit_data = commit_data.filter(function(d) {
		if (d[0] >= xScale.domain()[0] && d[0] <= xScale.domain().slice(-1)[0]){
	  		return d;
	  	}
	})

    var tag_sums = d3.nest() //rollup total commit counts for each unique tag
      .key(function(d) { return d[2];})
      .rollup(function(d) { 
       return d3.sum(d, function(g) {return g[3]; });
      }).entries(commit_data);

    //sort the sumed tagged commit counts largest to smallest
	var ordered_tags = tag_sums.sort(function(x, y){
	   return d3.descending(x.values, y.values);
	})

    var tag_count = Math.min(ordered_tags.length,max_tags) //count of displayed tags the min of total tag count or maximum allowed tag count

    //get ordered list of top tag_count tags, and use this to filter out tag data with commit counts smaller then top tag_count tags
    var truncated_tags = d3.values(ordered_tags.slice(0,tag_count)).map(function(d) {
                            return d.key; 
                         });
    var truncated_data = commit_data.filter(function(d) {
        if (truncated_tags.indexOf(d[2]) != -1) {
            return d;
        }
    })

    var tag_color = d3.scale.ordinal()
        .domain(ordered_tags.map( function (d) {return d.key; }))
        .range(colorbrewer.Set2[8]);

	var repos = d3.nest() //this function builds a data dict keyed on unique repo names
	  .key(function(d) { return d[1];})
	  .entries(commit_data);

	var yScale = d3.scale.ordinal() //used for commit_tag y offseting
               .domain(ordered_tags.map( function (d) { return d.key; }))
    yScale.rangeBands([0, yScale.domain().length], 0);

	var repoScale = d3.scale.ordinal() //used for repo coloring
               .domain(commit_data.map( function (d) { return d[1]; }))
    repoScale.rangeBands([0, repoScale.domain().length], 0);


 	var rScale = d3.scale.linear() //scale for sizing circles
		.domain([0, d3.max(commit_data, function(d) {return d[3]; })])
		.range([2, 9]);

	d3.select(".tagged_commit").remove();
	var g = github_svg.append("g").attr("class","tagged_commit")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var circles = g.selectAll("circle")
		.data(truncated_data) 
		.enter()
		.append("circle");

	var text = g.selectAll("text")
		.data(truncated_data)
		.enter()
		.append("text");

	circles
		.attr("cx", function(d) {return xScale(d[0]); })
		.attr("cy", function(d) {return yScale(d[2])*margin.commit_tags+margin.commit_tags;})
		.attr("r", function(d) { return rScale(d[3]); })
		.style("stroke", function(d) {return repo_color(repoScale(d[1]));})
        .style("stroke-width",3)
		.style("fill", function(d) {return tag_color(d[2]);});


	text
		.attr("x",-85)
		.attr("y", function(d){return yScale(d[2])*margin.commit_tags+25;})
		.attr("class","value")
		.text(function(d){ return d[2]; })
		.style("fill", function(d,i) { return tag_color(d[2]); });


	var repo_legend_circs = g.selectAll("repo_circs")
		.data(repos)
		.enter()
		.append("circle")
		.attr("cx", function(d,i) {return i*margin.repos;})
		.attr("cy", yScale.domain().length*margin.commit_tags + margin.commit_tags*2)
		.attr("r", 10)
		.style("stroke", function(d) {return repo_color(repoScale(d.key));})
        .style("stroke-width",3)
		.style("fill","none");

	var repo_legend_text = g.selectAll("repo_text")
		.data(repos)
		.enter()
		.append("text")
		.attr("x", function(d,i) {return i*margin.repos + 15;})
		.attr("y", yScale.domain().length*margin.commit_tags + margin.commit_tags*2 + 5)
		.text(function(d){return d.key;});

	//github_svg.attr("height",yScale.domain().length*margin.commit_tags + margin.commit_tags*2 + margin.top + 15)
}

function redrawChart(commit_data,xAxis) {
    github_svg.select('.x.axis').call(xAxis);
    draw_github(commit_data,xAxis.scale())
}
	
//navChart modified from http://blog.scottlogic.com/2014/09/19/interactive.html
function draw_navChart(commit_data,xScale,xAxis){
    var summary_data = d3.nest()
      .key(function(d) { return d[0];})
      .rollup(function(d) { 
       return d3.sum(d, function(g) {return g[3]; });
      }).entries(commit_data);

    summary_data.forEach(function(d){d.key = new Date(d.key)}) //d3.nest makes key into string object, this makes it a Date object again

    yMax = d3.max(summary_data,function(d){return d.values;})

    var navWidth = width;

    d3.select(".navigator").remove();
    var navChart = github_svg.append("g").attr("class","navigator")
            .attr("transform", "translate(" + margin.left + "," + github_height + ")");

    var minDate = d3.min(commit_data, function (d) { return d[0]; });
    var maxDate = d3.max(commit_data, function (d) { return d[0]; });

    var navXScale = d3.time.scale()
            .domain([minDate, maxDate])
            .range([0, navWidth]),
        navYScale = d3.scale.linear()
            .domain([0, yMax])
            .range([navHeight, 0]);

    d3.select(".commit_bars").remove();
    github_svg.append("g")
              .attr("transform", "translate(" + margin.left + "," +  (github_height) + ")")
              .attr("class","commit_bars")
              .selectAll("bar")
            .data(summary_data).enter().append("rect")
            .style("fill", "steelblue")
            .attr("x", function(d) { return navXScale(d.key); })
            .attr("width", 5)
            .attr("y", function(d) { return navYScale(d.values); })
            .attr("height", function(d) { return navHeight - navYScale(d.values); });

    var resolution = d3.select('select').property('value') //TODO: need to get this parameter from webform dropdown box

    var navXAxis = d3.svg.axis()
    .scale(navXScale)
    .orient('top')
    .ticks(resolution_dict[resolution][2], 1); //ticks updated by the nav level tick interval stored in the resolution dictionary for each respective resolution

    d3.select(".navx.axis").remove();
    github_svg.append('g')
        .attr('class', 'navx axis')
        .attr("transform", "translate(" + margin.left + "," +  (navHeight +github_height) + ")")
        .call(navXAxis);

    d3.select(".commit_label").remove();
    github_svg.append("g")
            .attr("class","commit_label")
             .attr("transform", "translate(" + (margin.left-15) + "," +  (navHeight +github_height) + ")")
             .append("text")
             .text("Commit Count")
             .attr("transform", "rotate(-90)");

    var viewport = d3.svg.brush()
    .x(navXScale)
    .on("brush", function () {
        xScale.domain(viewport.empty() ? navXScale.domain() : viewport.extent());
        redrawChart(commit_data,xAxis);
    });

   navChart.append("g")
    .attr("class", "viewport")
    .call(viewport)
    .selectAll("rect")
    .attr("height", navHeight);

    viewport.extent(xScale.domain());
    navChart.select('.viewport').call(viewport);
}
d3.json("commit_tag_tuples.json",initial_github_draw)