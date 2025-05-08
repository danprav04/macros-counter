// src/components/StatisticsChart.tsx
// components/StatisticsChart.tsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native"; // Added Platform
import { WebView } from "react-native-webview";
import { Statistics, MacroType, macros as macroKeys } from "../types/settings"; // Renamed import to avoid conflict
import { useTheme } from "@rneui/themed";
import { t } from '../localization/i18n';

interface StatisticsChartProps {
  statistics: Statistics;
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ statistics }) => {
  const { theme } = useTheme();

  const getChartTitle = (macro: MacroType): string => { // Ensure macro is MacroType
    switch(macro) {
        case 'calories': return t('dailyProgress.calories');
        case 'protein': return t('dailyProgress.protein');
        case 'carbs': return t('dailyProgress.carbs');
        case 'fat': return t('dailyProgress.fat');
        default:
            // This should not happen if MacroType is strictly "calories" | "protein" | "carbs" | "fat"
            const exhaustiveCheck: never = macro;
            return exhaustiveCheck; // Fallback, or handle unexpected macro
    }
  };

  const generateChartHTML = () => {
    const chartData = (macroKeys as readonly MacroType[]).reduce((acc, macro) => { // Cast macroKeys to MacroType[]
      acc[macro] = statistics[macro].map((series) =>
        series.map((item) => [item.x / 1000, item.y])
      );
      return acc;
    }, {} as { [key in MacroType]: number[][][] });

    const textColor = theme.colors.text;
    const gridColor = theme.colors.grey5;
    const axisColor = theme.colors.grey3; // Not used in current uPlot config, but kept
    const fontFamily = Platform.OS === 'ios' ? "System" : "sans-serif";

    const lineColors = {
      calories: theme.colors.primary, protein: theme.colors.success,
      carbs: theme.colors.warning, fat: theme.colors.error,
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
            ${(macroKeys as readonly MacroType[]).map((macro) => { // Cast macroKeys
                const isCalories = macro === "calories";
                const seriesCount = isCalories ? 2 : 1; // Calories has intake + goal
                const chartTitle = getChartTitle(macro);

                const seriesConfig = isCalories
                  ? `[ {}, { stroke: "${lineColors[macro] || theme.colors.primary}", width: 2, label: "${t('dailyProgress.calories')} Intake", points: { show: false } }, { stroke: "red", width: 1, dash: [5, 5], label: "${t('dailyProgress.calories')} Goal", points: { show: false } } ]`
                  : `[ {}, { stroke: "${lineColors[macro] || theme.colors.primary}", width: 2, label: "${chartTitle}", points: { show: false } } ]`;

                const uPlotData = seriesCount === 2 && chartData[macro] && chartData[macro].length >= 2
                    ? `[data[0].map(d => d[0]), data[0].map(d => d[1]), data[1].map(d => d[1])]`
                    : (chartData[macro] && chartData[macro].length >=1 ? `[data[0].map(d => d[0]), data[0].map(d => d[1])]` : `[[],[]]`);


                return `
                <div id="${macro}-chart" class="chart-container"></div>
                <script>
                    const data = ${JSON.stringify(chartData[macro])};
                    const opts = {
                        title: "${chartTitle}",
                        width: window.innerWidth * 0.95,
                        height: 250,
                        scales: { x: { time: true }, y: { }, },
                        axes: [
                            { stroke: "${textColor}", font: "14px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 } },
                            { stroke: "${textColor}", font: "14px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 } }
                        ],
                        series: ${seriesConfig},
                        cursor: { drag: { setScale: false }, points: { size: 6, fill: (self, i) => self.series[i]._stroke, stroke: (self, i) => self.series[i]._stroke, } },
                        ${isCalories ? `
                        hooks: {
                            draw: [
                                (u) => {
                                   const ctx = u.ctx;
                                    u.series.forEach((series, seriesIdx) => {
                                      if (seriesIdx === 1 && data && data.length >= 2 && data[0] && data[1]) { // Check data existence
                                        const intakeData = data[0];
                                        const goalData = data[1];

                                        ctx.beginPath();
                                        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";

                                        for (let i = 0; i < intakeData.length; i++) {
                                          const intakeY = intakeData[i][1];
                                          const goalY = goalData[i] ? goalData[i][1] : 0; // Safe access to goalData
                                          const x = u.valToPos(intakeData[i][0], "x", true);

                                            if(intakeY > goalY){
                                                const intakeYPos = u.valToPos(intakeY, 'y', true);
                                                if(i === 0){ ctx.moveTo(x, intakeYPos); }
                                                else{ ctx.lineTo(x, intakeYPos); }
                                            }
                                        }
                                         for (let i = intakeData.length-1; i >= 0; i--) {
                                            const intakeY = intakeData[i][1];
                                            const goalY = goalData[i] ? goalData[i][1] : 0; // Safe access
                                             const x = u.valToPos(intakeData[i][0], "x", true);
                                            if(intakeY > goalY){
                                                 const goalYPos = u.valToPos(goalY, 'y', true);
                                                ctx.lineTo(x, goalYPos);
                                            }
                                         }
                                        ctx.closePath();
                                        ctx.fill();
                                        }
                                    });
                                }
                            ]
                        }` : ''}
                    };
                    if (data && (data.length > 0 && data[0].length > 0 || data.length > 1 && data[1].length > 0)) { // Ensure data is not empty
                        new uPlot(opts, ${uPlotData}, document.getElementById('${macro}-chart'));
                    } else {
                        // Optionally display a message if no data for this chart
                        // document.getElementById('${macro}-chart').innerHTML = '<p style="text-align:center; padding-top:100px;">No data available for ${chartTitle}</p>';
                    }
                </script>
            `;}).join("")}
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
        scrollEnabled={false} // Keep false if you want fixed height charts
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    height: 'auto', // Allow WebView to determine its height based on content for scrollEnabled=true
    minHeight: 340 * (macroKeys.length > 0 ? 1 : 0), // Min height based on one chart, or adjust dynamically
    width: "100%",
    marginTop: 10,
  },
  webView: {
    flex: 1, // Needed if webViewContainer height is auto and scrollEnabled=true
    // height: 340, // Remove fixed height if scrollEnabled=true
  },
});

export default StatisticsChart;