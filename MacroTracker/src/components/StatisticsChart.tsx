// src/components/StatisticsChart.tsx
// components/StatisticsChart.tsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Statistics, MacroType, macros } from "../types/settings";
import { useTheme } from "@rneui/themed";
import { t } from '../localization/i18n';

interface StatisticsChartProps {
  statistics: Statistics;
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ statistics }) => {
  const { theme } = useTheme();

  const getChartTitle = (macro: MacroType) => {
    switch(macro) {
        case 'calories': return t('dailyProgress.calories');
        case 'protein': return t('dailyProgress.protein');
        case 'carbs': return t('dailyProgress.carbs');
        case 'fat': return t('dailyProgress.fat');
        default: return macro.charAt(0).toUpperCase() + macro.slice(1);
    }
  };

  const generateChartHTML = () => {
    const chartData = macros.reduce((acc, macro) => {
      acc[macro] = statistics[macro].map((series) =>
        series.map((item) => [item.x / 1000, item.y])
      );
      return acc;
    }, {} as { [key in MacroType]: number[][][] });

    const textColor = theme.colors.text;
    const gridColor = theme.colors.grey5;
    const axisColor = theme.colors.grey3;
    const fontFamily = Platform.OS === 'ios' ? "System" : "sans-serif"; // Basic font stack

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
            ${macros.map((macro) => {
                const isCalories = macro === "calories";
                const seriesCount = isCalories ? 2 : 1;
                const chartTitle = getChartTitle(macro); // Get translated title

                const seriesConfig = isCalories
                  ? `[ {}, { stroke: "${lineColors[macro] || theme.colors.primary}", width: 2, label: "Intake", points: { show: false } }, { stroke: "red", width: 1, dash: [5, 5], label: "Goal", points: { show: false } } ]`
                  : `[ {}, { stroke: "${lineColors[macro] || theme.colors.primary}", width: 2, label: "${chartTitle}", points: { show: false } } ]`;
                const uPlotData = seriesCount === 2
                    ? `[data[0].map(d => d[0]), data[0].map(d => d[1]), data[1].map(d => d[1])]`
                    : `[data[0].map(d => d[0]), data[0].map(d => d[1])]`;

                return `
                <div id="${macro}-chart" class="chart-container"></div>
                <script>
                    const data = ${JSON.stringify(chartData[macro])};
                    const opts = {
                        title: "${chartTitle}", width: window.innerWidth * 0.95, height: 250,
                        scales: { x: { time: true }, y: { }, },
                        axes: [ { stroke: "${textColor}", font: "14px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 } }, { stroke: "${textColor}", font: "14px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 } } ],
                        series: ${seriesConfig},
                        cursor: { drag: { setScale: false }, points: { size: 6, fill: (self, i) => self.series[i]._stroke, stroke: (self, i) => self.series[i]._stroke, } },
                        ${isCalories ? `hooks: { draw: [ (u) => { const ctx = u.ctx; u.series.forEach((series, seriesIdx) => { if (seriesIdx === 1) { const intakeData = data[0]; const goalData = data[1]; ctx.beginPath(); ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; for (let i = 0; i < intakeData.length; i++) { const intakeY = intakeData[i][1]; const goalY = goalData[i][1]; const x = u.valToPos(intakeData[i][0], "x", true); if(intakeY > goalY){ const intakeYPos = u.valToPos(intakeY, 'y', true); if(i === 0){ ctx.moveTo(x, intakeYPos); }else{ ctx.lineTo(x, intakeYPos); } } } for (let i = intakeData.length-1; i >= 0; i--) { const intakeY = intakeData[i][1]; const goalY = goalData[i][1]; const x = u.valToPos(intakeData[i][0], "x", true); if(intakeY > goalY){ const goalYPos = u.valToPos(goalY, 'y', true); ctx.lineTo(x, goalYPos); } } ctx.closePath(); ctx.fill(); } }); } ] }` : ''}
                    };
                    new uPlot(opts, ${uPlotData}, document.getElementById('${macro}-chart'));
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
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webViewContainer: { height: 'auto', width: "100%", marginTop: 10, },
  webView: { height: 340, },
});

export default StatisticsChart;