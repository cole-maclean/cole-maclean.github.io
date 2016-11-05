var max_ticks = 12

function initial_draw(data,svg,resolution,resolution_dict){

	var resolved_data = data[resolution] //data is a list of [0-timestamp,1-legend,2-tag,3-count] tuples summarized and keyed by hour, day, month and year
	resolved_data.forEach(function(d){
        d[0] = resolution_dict[resolution][0](d[0]); //this parses the string date data into the proper date format using the respective resolution level parser
    });

    var maxDate = d3.max(resolved_data, function (d) { return d[0]; }); //max date in data set
    var minDate = Math.max(d3.min(resolved_data, function (d) { return d[0]; }),d3.time.day.offset(maxDate, resolution_dict[resolution][3])); //minDate is selected as the max date that results from either the min date 
                                                                                                                                            //in the dataset, 
                                                                                                                                           //or offseting by the default offset days in the resolution dict 
 	var xScale = d3.time.scale().range([0, width]) //this is the x-axis scalled by commit dates
        .domain([minDate,maxDate]);

    var xAxis = d3.svg.axis()
	.scale(xScale)
	.orient("top")
	.ticks(resolution_dict[resolution][1][0],resolution_dict[resolution][1][1]); //ticks updated by the top level tick interval stored in the resolution dictionary for each respective resolution

    svg.select(".x.axis").remove();
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.call(xAxis); //adds x-date axis on top of svg

    draw_tag_viz(resolved_data,svg,xScale)
    draw_navChart(resolved_data,svg,resolution,resolution_dict,xScale,xAxis)

}
//base viz modified from http://neuralengr.com/asifr/journals/
function draw_tag_viz(resolved_data,svg,xScale){
    //commit_data is list of tuples in form (with index) [0-timestamp,1-legend,2-tag,3-count]
    //data is filtered between the date interval selected in the nav chart
	resolved_data = resolved_data.filter(function(d) {
		if (d[0] >= xScale.domain()[0] && d[0] <= xScale.domain().slice(-1)[0]){
	  		return d;
	  	}
	})

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return ("<strong>Tag:</strong> <span style='color:white'>" + d[2] + 
        "</br>Count:" + d[3] + 
        "</span>")
      })

    svg.call(tip);
    //make xaxis tick intervals responsive by removing every tick_removal_interval tick from the graphic to avoid text bunching together
    var tick_count = svg.select(".x.axis").selectAll(".tick")[0].length;
    var tick_remove_count = Math.max(1,(tick_count - max_ticks));
    var tick_removal_interval = (tick_count/tick_remove_count);
    var removal = tick_removal_interval;

    svg.select(".x.axis").selectAll(".tick").each(function(d,i){
        if (tick_remove_count > 1) {
            if (removal >= tick_removal_interval){
                    d3.select(this).remove()
                    removal = removal - tick_removal_interval
                }
            removal = removal + 1
        }
    })

    var tag_sums = d3.nest() //rollup total commit counts for each unique tag
      .key(function(d) { return d[2];})
      .rollup(function(d) { 
       return d3.sum(d, function(g) {return g[3]; });
      }).entries(resolved_data);

    //sort the sumed tagged commit counts largest to smallest
	var ordered_tags = tag_sums.sort(function(x, y){
	   return d3.descending(x.values, y.values);
	})

    var tag_count = Math.min(ordered_tags.length,max_tags) //count of displayed tags the min of total tag count or maximum allowed tag count

    //get ordered list of top tag_count tags, and use this to filter out tag data with commit counts smaller then top tag_count tags
    var truncated_tags = d3.values(ordered_tags.slice(0,tag_count)).map(function(d) {
                            return d.key; 
                         });
    var truncated_data = resolved_data.filter(function(d) {
        if (truncated_tags.indexOf(d[2]) != -1) {
            return d;
        }
    })

    var tag_color = d3.scale.ordinal()
        .domain(ordered_tags.map( function (d) {
                if (truncated_tags.indexOf(d.key) != -1){
                    return d.key
                }
            }))
        .range(colorbrewer.Set2[8]);

	var legend = d3.nest() //this function builds a data dict keyed on unique legend names
	  .key(function(d) { return d[1];})
	  .entries(truncated_data);

	var yScale = d3.scale.ordinal() //used for commit_tag y offseting
        .domain(ordered_tags.map( function (d) {
                if (truncated_tags.indexOf(d.key) != -1){
                    return d.key
                }
            }))
    yScale.rangeBands([0, yScale.domain().length], 0);


	var legendScale = d3.scale.ordinal() //used for legend coloring
               .domain(resolved_data.map( function (d) { return d[1]; }))
    legendScale.rangeBands([0, legendScale.domain().length], 0);


 	var rScale = d3.scale.linear() //scale for sizing circles
		.domain([0, d3.max(resolved_data, function(d) {return d[3]; })])
		.range([2, 9]);

	svg.select(".tag").remove();
	var g = svg.append("g").attr("class","tag")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var circles = g.selectAll("circle")
		.data(truncated_data) 
		.enter()
		.append("circle");

	var text = g.selectAll("text")
		.data(truncated_data)
		.enter()
        .append("svg:a")
        .attr("xlink:href", function(d){ return "http://cole-maclean.github.io/tags/"+d[2].toLowerCase()})
		.append("text");

	circles
		.attr("cx", function(d) {return xScale(d[0]); })
		.attr("cy", function(d) {return yScale(d[2])*margin.tag+margin.tag;})
		.attr("r", function(d) { return rScale(d[3]); })
		.style("stroke", function(d) {return legend_color(legendScale(d[1]));})
        .style("stroke-width",2)
        .style("stroke-opacity",0.3)
		.style("fill", function(d) {return tag_color(d[2]);})
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


	text
		.attr("x",-margin.left+5)
		.attr("y", function(d){return yScale(d[2])*margin.tag+25;})
		.attr("class","value")
		.text(function(d){ return d[2]; })
		.style("fill", function(d,i) { return tag_color(d[2]); });


	var legend_circs = g.selectAll("legend_circs")
		.data(legend)
		.enter()
        .append("svg:a")
        .attr("xlink:href", function(d){ return "http://cole-maclean.github.io/blog/"+d.key})
		.append("circle")
		.attr("cx", function(d,i) {return i*margin.legend;})
		.attr("cy", yScale.domain().length*margin.tag + margin.tag-13)
		.attr("r", 10)
		.style("stroke", function(d) {return legend_color(legendScale(d.key));})
        .style("stroke-opacity",0.3)
        .style("stroke-width",3)
		.style("fill","transparent");

	var legend_text = g.selectAll("legend_text")
		.data(legend)
		.enter()
        .append("svg:a")
        .attr("xlink:href", function(d){ return "http://cole-maclean.github.io/blog/"+d.key})
		.append("text")
		.attr("x", function(d,i) {return i*margin.legend + 15;})
		.attr("y", yScale.domain().length*margin.tag + margin.tag-8)
		.text(function(d){return d.key;});
}

function redrawChart(resolved_data,svg,xAxis) {
    svg.select('.x.axis').call(xAxis);
    draw_tag_viz(resolved_data,svg,xAxis.scale())
}
	
//navChart modified from http://blog.scottlogic.com/2014/09/19/interactive.html
function draw_navChart(resolved_data,svg,resolution,resolution_dict,xScale,xAxis){
    var summary_data = d3.nest()
      .key(function(d) { return d[0];})
      .rollup(function(d) { 
       return d3.sum(d, function(g) {return g[3]; });
      }).entries(resolved_data);

    summary_data.forEach(function(d){d.key = new Date(d.key)}) //d3.nest makes key into string object, this makes it a Date object again

    yMax = d3.max(summary_data,function(d){return d.values;})

    var navWidth = width;

    svg.select(".navigator").remove();
    var navChart = svg.append("g").attr("class","navigator")
            .attr("transform", "translate(" + margin.left + "," + height + ")");

    var minDate = d3.min(resolved_data, function (d) { return d[0]; });
    var maxDate = d3.max(resolved_data, function (d) { return d[0]; });

    var navXScale = d3.time.scale()
            .domain([minDate, maxDate])
            .range([0, navWidth]),
        navYScale = d3.scale.linear()
            .domain([0, yMax])
            .range([navHeight, 0]);

    svg.select(".commit_bars").remove();
    svg.append("g")
              .attr("transform", "translate(" + margin.left + "," +  (height) + ")")
              .attr("class","commit_bars")
              .selectAll("bar")
            .data(summary_data).enter().append("rect")
            .style("fill", "steelblue")
            .attr("x", function(d) { return navXScale(d.key); })
            .attr("width", 5)
            .attr("y", function(d) { return navYScale(d.values); })
            .attr("height", function(d) { return navHeight - navYScale(d.values); });

    var navXAxis = d3.svg.axis()
    .scale(navXScale)
    .orient('top')
    .ticks(resolution_dict[resolution][2][0], resolution_dict[resolution][2][1]); //ticks updated by the nav level tick interval stored in the resolution dictionary for each respective resolution

    svg.select(".navx.axis").remove();
    svg.append('g')
        .attr('class', 'navx axis')
        .attr("transform", "translate(" + margin.left + "," +  (navHeight +height) + ")")
        .call(navXAxis);

    svg.select(".commit_label").remove();
    svg.append("g")
            .attr("class","commit_label")
             .attr("transform", "translate(" + (margin.left-15) + "," +  (navHeight +height) + ")")
             .append("text")
             .text("Total Count")
             .attr("transform", "rotate(-90)");

    var viewport = d3.svg.brush()
    .x(navXScale)
    .on("brush", function () {
        xScale.domain(viewport.empty() ? navXScale.domain() : viewport.extent());
        redrawChart(resolved_data,svg,xAxis);
    });

   navChart.append("g")
    .attr("class", "viewport")
    .call(viewport)
    .selectAll("rect")
    .attr("height", navHeight);

    viewport.extent(xScale.domain());
    navChart.select('.viewport').call(viewport);
}