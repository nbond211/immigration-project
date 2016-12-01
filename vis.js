var parseTime = d3.timeParse("%Y");

d3.queue()
    .defer(d3.csv, "immigration.csv")
    .defer(d3.csv, "quota.csv")
    .defer(d3.csv, "nonquota.csv")
    .await(function (error, immigrationData, quotaData, nonQuotaData) {
        if (error) {
            console.error('Oh dear, something went wrong with the immigrant data: ' + error);
        } else {
            buildMap(immigrationData, quotaData, nonQuotaData)
        }
});
     /////////////////////////////////////
        // Countries Of Origin          //
        ///////////////////////////////////
function buildMap(immigrationData, quotaData, nonQuotaData) {
// referenced from https://bl.ocks.org/MariellaCC/0055298b94fcf2c16940
    d3.json("europetopo.json", function(error, mapdata) {
      if (error) {
            console.error('Oh dear, something went wrong with the map data:' + error);
            return;
        }
      var selectedImmigrationData = []
      selectedImmigrationData.columns=["Year"];
      immigrationData.forEach(function(element){
        selectedImmigrationData.push({"Year": element.Year})
      })
      var selectedQuotaData = [];
      selectedQuotaData.columns=["Year"];
      quotaData.forEach(function(element){
        selectedQuotaData.push({"Year": element.Year})
      })
      var selectedNonQuotaData = [];

     var tooltip = d3.select(".container-fluid")
	.append("div")
    .attr('class', 'tooltip')
	.style("position", "absolute")
	.style("z-index", "10")
	.style("visibility", "hidden");

      var svg = d3.select("#map-svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 " + 960 + " "  + 600)
      .selectAll("path")
      .data(mapdata.features)
      .enter()
      .append("path")
      .attr("d", d3.geoPath(d3.geoMercator().center([ 13, 52 ])
       .translate([ 960/2, 600/2 ])
       .scale([ 960/1.25 ])))
      .attr("stroke", "rgba(8, 81, 156, 0.2)")
      .attr("fill", "rgba(8, 81, 156, 0.6)").
      attr("class", function(d){
        if(d.properties.displayOnly){
          return "displayOnly";
        }
        return d.properties.name + " country-option"})
      .on("mouseover", function(d) {
        if(!d.properties.displayOnly){
          d3.select(this).style("cursor", "pointer").style("fill-opacity","0.5");
          tooltip.text(d.properties.name);
          tooltip.style("visibility", "visible");
        }
      })
      .on("mousemove", function(d){
        if(!d.properties.displayOnly){
          return tooltip.style("top", (d3.event.pageY)+"px").style("left",(d3.event.pageX + 25) +"px");
        }
      })
      .on("mouseout", function(d) {
        if(!d.properties.displayOnly){
          d3.select(this).style("cursor", "default").style("fill-opacity","1");
          tooltip.style("visibility", "hidden");
        }
      })
      .on("click", selectData);
      function selectData(d){
        if(d.properties.displayOnly){
          return;
        }
        selectThis = d3.select(this)
        var countryName = d.properties.name
        selectThis.classed("selected", !selectThis.classed("selected"));
        ////////FILTERING IMMIGRATION DATA
        immigrationData.forEach(function(dataEl){//for each year object in main data
          selectedImmigrationData.forEach(function(selectEl){// and for each year object in selected data
            if(dataEl.Year == selectEl.Year) // find the corresponding year object in the main anad selected data
              if(selectEl[countryName]){//if the selected country is already in the selected data
                delete selectEl[countryName]//remove it from selected list
              } else {// otherwise add it to the selected list
                selectEl[countryName] = dataEl[countryName]
              }
            })
        })
        var index = selectedImmigrationData.columns.indexOf(countryName);//find the index of the country name in the columns field
        if (index > -1) {//if its found
         selectedImmigrationData.columns.splice(index, 1); //remove it
       } else {//otherwise add it
        selectedImmigrationData.columns.push(countryName)
      }
      ///////////////FILTERING QUOTA DATA
      quotaData.forEach(function(dataEl){//for each year object in main data
          selectedQuotaData.forEach(function(selectEl){// and for each year object in selected data
            if(dataEl.Year == selectEl.Year) // find the corresponding year object in the main anad selected data
              if(selectEl[countryName]){//if the selected country is already in the selected data
                delete selectEl[countryName]//remove it from selected list
              } else {// otherwise add it to the selected list
                selectEl[countryName] = dataEl[countryName]
              }
            })
        })
        var index = selectedQuotaData.columns.indexOf(countryName);//find the index of the country name in the columns field
        if (index > -1) {//if its found
         selectedQuotaData.columns.splice(index, 1); //remove it
       } else {//otherwise add it
        selectedQuotaData.columns.push(countryName)
      }
      buildImmigrationChart(selectedImmigrationData, selectedQuotaData, nonQuotaData)// re-render rest of charts
    }
    buildImmigrationChart(selectedImmigrationData, quotaData, nonQuotaData)// first render of charts

  });

};



        /////////////////////////////////////
        // Immigration Over Time   //
        ///////////////////////////////////
function buildImmigrationChart(immigrationData, quotaData, nonQuotaData) {
        d3.select('#immigration-vis-container').select('svg').remove();
        d3.select('#immigration-vis-container').append('svg').attr('id', 'immigration-svg');
        var svg = d3.select("#immigration-svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + 960 + " "  + 600)
            margin = {
                top: 100,
                right: 200,
                bottom: 30,
                left: 100
            },
            width = 960 - margin.left - margin.right,
            height = 600 - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("text")
        .attr("x", ((width + margin.left + margin.right) / 2))
        .attr("y", (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "2em")
        .text("Immigrants Admitted into the US Anually");

        var xImmigration = d3.scaleTime().range([0, width]),
            yImmigration = d3.scaleLinear().range([height, 0]),
            zImmigration = d3.scaleOrdinal(d3.schemeCategory10);

        var line = d3.line()
            .curve(d3.curveBasis)
            .x(function (d) {
                return xImmigration(d.year);
            })
            .y(function (d) {
                return yImmigration(d.immigration);
            });

        var countries = immigrationData.columns.slice(1).map(function (id) {
            return {
                id: id,
                values: immigrationData.map(function (d) {
                    return {
                        year: parseTime(d.Year),
                        immigration: +d[id]
                    };
                })
            };
        });
        var quotas = quotaData.columns.slice(1).map(function (id) {
            return {
                id: id,
                values: quotaData.map(function (d) {
                    return {
                        year: parseTime(d.Year),
                        quota: +d[id]
                    };
                })
            };
        });

        var brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("brush end", brushed);

        var context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, [0,0]);


        xImmigration.domain(d3.extent(immigrationData, function (d) {
            return parseTime(d.Year);
        }));

        yImmigration.domain([
        d3.min(countries, function (c) {
                return d3.min(c.values, function (d) {
                    return d.immigration;
                });
            }),
        d3.max(countries, function (c) {
                return d3.max(c.values, function (d) {
                    return d.immigration;
                });
            })
      ]);

        zImmigration.domain(countries.map(function (c) {
            return c.id;
        }));

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xImmigration));

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(yImmigration))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("fill", "#000")
            .text("number of immigrants");

        var city = g.selectAll(".country")
            .data(countries)
            .enter().append("g")
            .attr("class", "country");

        city.append("path")
            .attr("class", function (d) {return d.id + " line"})
            .attr("d", function (d) {
                return line(d.values);
            });
            /*.style("stroke", function (d) {
                return zImmigration(d.id);
            });*/

        city.append("text")
            .datum(function (d) {
                return {
                    id: d.id,
                    value: d.values[d.values.length - 1]
                };
            })
            .attr("transform", function (d) {
                return "translate(" + xImmigration(d.value.year) + "," + yImmigration(d.value.immigration) + ")";
            })
            .attr("x", 3)
            .attr("dy", "0.35em")
            .style("font", "1.5em sans-serif")
            .text(function (d) {
                return d.id;
            });

        function type(d, _, columns) {
            d.year = parseTime(d.year);
            for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
            return d;
        }

        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            var s = d3.event.selection || xImmigration.range();
            //xNonQuota.domain(s.map(x2.invert, x2));
            //focus.select(".area").attr("d", area);
            //focus.select(".axis--x").call(xAxis);
            /*svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));*/
            var minYear = s[0];
            var maxYear = s[1];
            var newData = [];

            for (var i = 0; i < countries.length; i++) {
                var country = countries[i].id;
                var immigrationValues = countries[i].values;
                var quotaValues = quotas[i].values;
                var totalImmigration = 0;
                var totalQuota = 0;

                for (var j = 0; j < immigrationValues.length; j++) {
                    if (xImmigration(immigrationValues[j].year) >= minYear && xImmigration(immigrationValues[j].year) <= maxYear) {

                        totalImmigration += immigrationValues[j].immigration;
                        totalQuota += quotaValues[j].quota;
                    }
                }

                var obj = {
                    country: country,
                    immigration: totalImmigration,
                    quota: totalQuota
                };
                newData.push(obj);
            }

            buildQuotaChart(newData);

            var dataFiltered = nonQuotaData.filter(function (d) {
                return (xImmigration(parseTime(d.Year)) >= minYear && xImmigration(parseTime(d.Year)) <= maxYear);
            });

            buildNonQuotaChart(dataFiltered);

        }

        buildNonQuotaChart(nonQuotaData);
        brushed();
    }
        ////////////////////////////////////////////////////////////
        // Actual Immigration Level vs Allotted Quota   //
        //////////////////////////////////////////////////////////
function buildQuotaChart(newData) {
    $("#quota-svg").empty();
    var quotaSvg = d3.select("#quota-svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + 960 + " "  + 600)
        quotaMargin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 100
        },
        quotaWidth = 960 - quotaMargin.left - quotaMargin.right,
        quotaHeight = 600 - quotaMargin.top - quotaMargin.bottom;

    var xQuota = d3.scaleBand().rangeRound([0, quotaWidth]).padding(0.1),
        yQuota = d3.scaleLinear().rangeRound([quotaHeight, 0]);

    var g = quotaSvg.append("g")
        .attr("transform", "translate(" + quotaMargin.left + "," + quotaMargin.top + ")");

    xQuota.domain(newData.map(function (d) {
        return d.country;
    }));
    yQuota.domain([0, d3.max(newData, function (d) {
        return Math.max(d.immigration, d.quota);
    })]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + quotaHeight + ")")
        .call(d3.axisBottom(xQuota));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(yQuota).ticks(10))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Immigration");

    g.selectAll(".immigration-bar")
        .data(newData)
        .enter().append("rect")
        .attr("class", function (d) { return d.country + " immigration-bar selected"})
        .attr("x", function (d) {
            return xQuota(d.country);
        })
        .attr("y", function (d) {
            return yQuota(d.immigration);
        })
        .attr("width", xQuota.bandwidth())
        .attr("height", function (d) {
            return quotaHeight - yQuota(d.immigration);
        });

    g.selectAll(".quota-bar")
        .data(newData)
        .enter().append("rect")
        .attr("class", "quota-bar")
        .attr("x", function (d) {
            return xQuota(d.country);
        })
        .attr("y", function (d) {
            return yQuota(d.quota);
        })
        .attr("width", xQuota.bandwidth())
        .attr("height", function (d) {
            return quotaHeight - yQuota(d.quota);
        });
}
        //////////////////////////////////////////////
        // Immigrants Exempt from Quota   //
        /////////////////////////////////////////////
function buildNonQuotaChart(newData) {
    $("#non-quota-svg").empty();
    var nonQuotaSvg = d3.select("#non-quota-svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + 960 + " "  + 600)
        nonQuotaMargin = {
            top: 20,
            right: 200,
            bottom: 30,
            left: 100
        },
        nonQuotaWidth = 960 - nonQuotaMargin.left - nonQuotaMargin.right,
        nonQuotaHeight = 600 - nonQuotaMargin.top - nonQuotaMargin.bottom,
        nonQuotaG = nonQuotaSvg.append("g").attr("transform", "translate(" + nonQuotaMargin.left + "," + nonQuotaMargin.top + ")");

    var xNonQuota = d3.scaleTime().range([0, nonQuotaWidth]),
        yNonQuota = d3.scaleLinear().range([nonQuotaHeight, 0]),
        zNonQuota = d3.scaleOrdinal(d3.schemeCategory10);

    var lineNonQuota = d3.line()
        .curve(d3.curveBasis)
        .x(function (d) {
            return xNonQuota(d.year);
        })
        .y(function (d) {
            return yNonQuota(d.immigration);
        });

    if (newData.length == 0) {
        return;
    }

    var namesOfClasses = ["Year", "Ministers and Professors", "Ministers", "Professors", "Students"];

    var classes = namesOfClasses.slice(1).map(function (id) {
        return {
            id: id,
            values: newData.map(function (d) {
                return {
                    year: parseTime(d.Year),
                    immigration: +d[id]
                };
            })
        };
    });

    xNonQuota.domain(d3.extent(newData, function (d) {
        return parseTime(d.Year);
    }));

    yNonQuota.domain([
    d3.min(classes, function (c) {
            return d3.min(c.values, function (d) {
                return d.immigration;
            });
        }),
    d3.max(classes, function (c) {
            return d3.max(c.values, function (d) {
                return d.immigration;
            });
        })
  ]);

    zNonQuota.domain(classes.map(function (c) {
        return c.id;
    }));

    nonQuotaG.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + nonQuotaHeight + ")")
        .call(d3.axisBottom(xNonQuota));

    nonQuotaG.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(yNonQuota))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("");

    var nonQuota = nonQuotaG.selectAll(".nonQuota")
        .data(classes)
        .enter().append("g")
        .attr("class", "nonQuota");

    nonQuota.append("path")
        .attr("class", "line")
        .attr("d", function (d) {
            return lineNonQuota(d.values);
        })
        .style("stroke", function (d) {
            return zNonQuota(d.id);
        });

    nonQuota.append("text")
        .datum(function (d) {
            return {
                id: d.id,
                value: d.values[d.values.length - 1]
            };
        })
        .attr("transform", function (d) {
            return "translate(" + xNonQuota(d.value.year) + "," + yNonQuota(d.value.immigration) + ")";
        })
        .attr("x", 3)
        .attr("dy", "0.35em")
        .style("font", "1.2em sans-serif")
        .text(function (d) {
            return d.id;
        });
}