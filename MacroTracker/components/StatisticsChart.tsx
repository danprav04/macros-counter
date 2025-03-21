// components/StatisticsChart.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { Statistics, MacroType, macros } from "../types/settings"; // Import types
import { useTheme } from "@rneui/themed";


interface StatisticsChartProps {
  statistics: Statistics;
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ statistics }) => {

    const { theme } = useTheme();

  const generateChartHTML = () => {
      const chartData = macros.reduce((acc, macro) => {
     // Prepare data for each macro, including goal if applicable
     acc[macro] = statistics[macro].map((series) =>
       series.map((item) => [item.x / 1000, item.y])
     );
     return acc;
   }, {} as { [key in MacroType]: number[][][] });

   const textColor = theme.colors.text;
   const gridColor = theme.colors.grey5; // Lighter grid
   const axisColor = theme.colors.grey3; // Slightly darker axis
   const fontFamily = "Helvetica, Arial, sans-serif";

   // Define color palette for the lines, using theme colors if possible
   const lineColors = {
     calories: theme.colors.primary,
     protein: theme.colors.success,
     carbs: theme.colors.warning,
     fat: theme.colors.error,
   };

   return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Macro Charts</title>
        <style>
           body { font-family: ${fontFamily}; margin: 0; padding: 0; background-color: ${theme.colors.background}; color: ${textColor};}
            .chart-container { width: 95%; height: 250px; margin: 10px auto; }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/uplot@1.6.27/dist/uPlot.min.css">
        <script src="https://unpkg.com/uplot@1.6.27/dist/uPlot.iife.min.js"></script>
    </head>
    <body>
        ${macros
          .map((macro) => {
            const isCalories = macro === "calories";
            const seriesCount = isCalories ? 2 : 1; // Two series for calories (intake, goal)
            const seriesConfig = isCalories
              ? `[
                  {},
                  {
                    stroke: "${lineColors[macro] || theme.colors.primary}",
                    width: 2,
                    label: "Intake",
                    points: { show: false }
                  },
                  {
                    stroke: "grey",
                    width: 1,
                    dash: [5, 5],
                    label: "Goal",
                    points: { show: false }
                  }
                ]`
              : `[
                  {},
                  {
                    stroke: "${lineColors[macro] || theme.colors.primary}",
                    width: 2,
                    label: "${macro.charAt(0).toUpperCase() + macro.slice(1)}",
                    points: { show: false }
                  }
                ]`;

            const uPlotData =
              seriesCount === 2
                ? `[data[0].map(d => d[0]), data[0].map(d => d[1]), data[1].map(d => d[1])]`
                : `[data[0].map(d => d[0]), data[0].map(d => d[1])]`;

            return `
            <div id="${macro}-chart" class="chart-container"></div>
            <script>
                const data = ${JSON.stringify(chartData[macro])};
                const opts = {
                    title: "${macro.charAt(0).toUpperCase() + macro.slice(1)}",
                    width: window.innerWidth * 0.95,
                    height: 250,
                    scales: {
                        x: { time: true },
                        y: { },
                    },
                    axes: [
                        {
                            stroke: "${axisColor}",
                            font: "12px ${fontFamily}",
                           grid: {
                                stroke: "${gridColor}",
                                width: 1
                            },
                            ticks: {
                                stroke: "${gridColor}",
                                width: 1
                            }
                        },
                        {
                            stroke: "${axisColor}",
                            font: "12px ${fontFamily}",
                            grid: {
                                stroke: "${gridColor}",
                                width: 1
                            },
                            ticks: {
                                stroke: "${gridColor}",
                                width: 1
                            }
                        }
                    ],
                    series: ${seriesConfig},
                    cursor: {
                        drag: { setScale: false },
                        points: {
                            size: 6,
                            fill: (self, i) => self.series[i]._stroke,
                            stroke: (self, i) => self.series[i]._stroke,
                        }
                    }
                };
                new uPlot(opts, ${uPlotData}, document.getElementById('${macro}-chart'));
            </script>
        `;
          })
          .join("")}
    </body>
    </html>
    `;
  };

  return (
    <View style={styles.webViewContainer}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: generateChartHTML() }}
        style={styles.webView}
        scalesPageToFit={false}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    webViewContainer: {
        height: 'auto',
        width: "100%",
        marginTop: 10,
    },
    webView: {
        height: 250 * (macros.length) + 50, // Explicit height, adjust as needed.
    },
});

export default StatisticsChart;