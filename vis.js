var parseTime = d3.timeParse("%Y");

d3.queue()
    .defer(d3.csv, "immigration.csv")
    .defer(d3.csv, "quota.csv")
    .defer(d3.csv, "nonquota.csv")
    .await(function (error, immigrationData, quotaData, nonQuotaData) {
        if (error) {
            console.error('Oh dear, something went wrong: ' + error);
        } else {
            //////////////////////////////////////////////////////////////////////////////////////////////////////
            // Immigration Vis

            console.log(nonQuotaData);

            var svg = d3.select("#immigration-svg"),
                margin = {
                    top: 20,
                    right: 80,
                    bottom: 30,
                    left: 50
                },
                width = svg.attr("width") - margin.left - margin.right,
                height = svg.attr("height") - margin.top - margin.bottom,
                g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
                .call(brush.move, xImmigration.range());


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
                .text("Immigration, number of people");

            var city = g.selectAll(".country")
                .data(countries)
                .enter().append("g")
                .attr("class", "country");

            city.append("path")
                .attr("class", "line")
                .attr("d", function (d) {
                    return line(d.values);
                })
                .style("stroke", function (d) {
                    return zImmigration(d.id);
                });

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
                .style("font", "10px sans-serif")
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
                console.log(newData);

                buildQuotaChart(newData);

                var dataFiltered = nonQuotaData.filter(function (d) {
                    return (xImmigration(parseTime(d.Year)) >= minYear && xImmigration(parseTime(d.Year)) <= maxYear);
                });

                buildNonQuotaChart(dataFiltered);

            }

            buildNonQuotaChart(nonQuotaData);
        }
        buildMap();

    });

function buildQuotaChart(newData) {
    $("#quota-svg").empty();
    var quotaSvg = d3.select("#quota-svg"),
        quotaMargin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 40
        },
        quotaWidth = +quotaSvg.attr("width") - quotaMargin.left - quotaMargin.right,
        quotaHeight = +quotaSvg.attr("height") - quotaMargin.top - quotaMargin.bottom;

    var xQuota = d3.scaleBand().rangeRound([0, quotaWidth]).padding(0.1),
        yQuota = d3.scaleLinear().rangeRound([quotaHeight, 0]);

    var g = quotaSvg.append("g")
        .attr("transform", "translate(" + quotaMargin.left + "," + quotaMargin.top + ")");

    xQuota.domain(newData.map(function (d) {
        return d.country;
    }));
    yQuota.domain([0, d3.max(newData, function (d) {
        if (d.quota == 0) {
            return d.immigration;
        } else {
            return d.quota;
        }
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
        .attr("class", "immigration-bar")
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

function buildNonQuotaChart(newData) {
    $("#non-quota-svg").empty();
    var nonQuotaSvg = d3.select("#non-quota-svg"),
        nonQuotaMargin = {
            top: 20,
            right: 80,
            bottom: 30,
            left: 50
        },
        nonQuotaWidth = nonQuotaSvg.attr("width") - nonQuotaMargin.left - nonQuotaMargin.right,
        nonQuotaHeight = nonQuotaSvg.attr("height") - nonQuotaMargin.top - nonQuotaMargin.bottom,
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

    console.log(newData.columns);

    if (newData.length == 0) {
        return;
    }

    var namesOfClasses = ["Year", "Ministers and Professors and their wives and children", "Ministers and their wives and children", "Professors and their wives and children", "Students"];

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
        .text("Temperature, ºF");

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
        .style("font", "10px sans-serif")
        .text(function (d) {
            return d.id;
        });
}
function buildMap() {

    d3.json("europetopo.json", function(error, mapdata) {
      if (error) return console.error(error);
      console.log(mapdata);

      var svg = d3.select("#map-svg").selectAll("path")
      .data(mapdata.features)
      .enter()
      .append("path")
       .attr("d", d3.geoPath(d3.geoMercator().center([ 13, 52 ]) //comment centrer la carte, longitude, latitude
                       .translate([ 960/2, 600/2 ]) // centrer l'image obtenue dans le svg
                       .scale([ 960/1.25 ])))
       .attr("stroke", "rgba(8, 81, 156, 0.2)")
       .attr("fill", "rgba(8, 81, 156, 0.6)").
       attr("class", function(d){return d.properties.admin})
      .on("mouseover", function(d) {d3.select(this).style("cursor", "pointer").style("fill","rgba(8, 81, 156, 0.2)")})
      .on("mouseout", function(d) {d3.select(this).style("cursor", "default").style("fill","rgba(8, 81, 156, 0.6)")});
   });
}