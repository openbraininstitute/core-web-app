# List of the different possible plots

## `json-piechart`: Pie chart visualization

```json
{
  "title": "Example Pie Chart",
  "description": "Distribution of categories in a pie chart",
  "values": [
    { "category": "Category A", "value": 40, "color": "#FF6384" },
    { "category": "Category B", "value": 25, "color": "#36A2EB" },
    { "category": "Category C", "value": 20, "color": "#FFCE56" },
    { "category": "Category D", "value": 15, "color": "#4BC0C0" }
  ]
}
```

## `json-barplot`: Bar plot visualization

```json
{
  "title": "Example Bar Plot",
  "description": "Values for different categories in a bar plot",
  "x_label": "Categories",
  "y_label": "Values",
  "values": [
    { "category": "Group 1", "value": 10, "color": "#FF6384" },
    { "category": "Group 2", "value": 15, "color": "#36A2EB" },
    { "category": "Group 3", "value": 7, "color": "#FFCE56" },
    { "category": "Group 4", "value": 12, "color": "#4BC0C0" }
  ]
}
```

## `json-scatterplot`: Scatter plot visualization

```json
{
  "title": "Example Scatter Plot",
  "description": "Random points in a scatter plot",
  "x_label": "X Axis",
  "y_label": "Y Axis",
  "values": [
    { "x": 1.2, "y": 3.4, "label": "Point 1", "color": "#FF6384", "size": 8 },
    { "x": 2.5, "y": 1.8, "label": "Point 2", "color": "#36A2EB", "size": 10 },
    { "x": 3.1, "y": 4.0, "label": "Point 3", "color": "#FFCE56", "size": 6 },
    { "x": 4.7, "y": 2.9, "label": "Point 4", "color": "#4BC0C0", "size": 9 }
  ]
}
```

## `json-histogram`: Histogram visualization

```json
{
  "title": "Example Histogram",
  "description": "Distribution of values in a histogram",
  "x_label": "Value bins",
  "y_label": "Frequency",
  "values": [1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 5, 6, 7, 8, 8, 9],
  "bins": 5,
  "color": "#36A2EB"
}
```

## `json-linechart`: Line chart visualization

```json
{
  "title": "Example Line Chart",
  "description": "Line chart showing trend over time",
  "x_label": "Time (days)",
  "y_label": "Measurement",
  "values": [
    { "x": 1, "y": 5 },
    { "x": 2, "y": 7 },
    { "x": 3, "y": 6 },
    { "x": 4, "y": 8 },
    { "x": 5, "y": 7 }
  ],
  "line_style": "solid",
  "line_color": "#FF6384"
}
```
