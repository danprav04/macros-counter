// src/components/StatisticsChart.tsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Statistics, MacroType, macros as macroKeys } from "../types/settings";
import { useTheme } from "@rneui/themed";
import { t } from '../localization/i18n';
import i18n from '../localization/i18n'; // Import i18n for locale
import * as Localization from 'expo-localization'; // Import Localization

// Declare uPlot as a global variable for TypeScript
declare const uPlot: any;

interface uPlotSeriesConfig {
  stroke?: string;
  width?: number;
  label?: string;
  points?: { show?: boolean; size?: number; fill?: string; stroke?: string; };
  dash?: number[];
  fill?: string;
}

interface StatisticsChartProps {
  statistics: Statistics;
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ statistics }) => {
  const { theme } = useTheme();

  const getChartTitle = (macro: MacroType): string => {
    switch(macro) {
        case 'calories': return t('dailyProgress.calories');
        case 'protein': return t('dailyProgress.protein');
        case 'carbs': return t('dailyProgress.carbs');
        case 'fat': return t('dailyProgress.fat');
        default: return macro;
    }
  };

  // Calculated height
  const chartHeightInHTML = 250;
  const chartVerticalMarginInHTML = 20;
  const totalEstimatedWebViewHeight = macroKeys.length * (chartHeightInHTML + chartVerticalMarginInHTML) + 40;

  const generateChartHTML = () => {
    // Prepare data for charts
    // FIX: Added '| null' to the type definition to handle gaps in data
    const chartData = (macroKeys as readonly MacroType[]).reduce((acc, macro) => {
      acc[macro] = statistics[macro].map((series) =>
        series.map((item) => ({ x: item.x / 1000, y: item.y }))
      );
      return acc;
    }, {} as { [key in MacroType]: { x: number; y: number | null }[][] });

    const textColor = theme.colors.text;
    const gridColor = theme.colors.grey5;
    const fontFamily = Platform.OS === 'ios' ? "System" : "sans-serif";

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
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Macro Charts</title>
            <style>
                html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; background-color: ${theme.colors.background}; }
                body { font-family: ${fontFamily}; color: ${textColor}; }
                .chart-container { width: 95%; height: ${chartHeightInHTML}px; margin: ${chartVerticalMarginInHTML / 2}px auto; }
                .no-data-message { display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: ${textColor}; font-size: 14px; }
            </style>
            <link rel="stylesheet" href="https://unpkg.com/uplot@1.6.27/dist/uPlot.min.css">
            <script src="https://unpkg.com/uplot@1.6.27/dist/uPlot.iife.min.js"></script>
        </head>
        <body>
            ${(macroKeys as readonly MacroType[]).map((macro) => {
                const currentMacroData = chartData[macro];
                const chartTitle = getChartTitle(macro);
                const isCalories = macro === "calories";
                
                const movingAverageLabel = t('statisticsChart.movingAverage');
                const goalLabel = t('statisticsChart.goal');

                const intakeSeries: uPlotSeriesConfig = {
                    stroke: lineColors[macro],
                    width: 2.5,
                    label: movingAverageLabel,
                    points: { show: false },
                    fill: `${lineColors[macro]}2A`,
                };
                
                const goalSeries: uPlotSeriesConfig = {
                    stroke: "#e74c3c",
                    width: 1.5,
                    dash: [10, 5],
                    label: goalLabel,
                    points: { show: false }
                };

                const seriesConfig: uPlotSeriesConfig[] = [
                    {}, // X-axis
                    intakeSeries
                ];

                if (isCalories) {
                    seriesConfig.push(goalSeries);
                }

                return `
                <div id="${macro}-chart" class="chart-container">
                    <div class="no-data-message">${t("statisticsChart.noData", { chartTitle: chartTitle })}</div>
                </div>
                <script>
                    (function() {
                        const chartElement = document.getElementById('${macro}-chart');
                        try {
                            const dataForChart = ${JSON.stringify(currentMacroData)};
                            
                            let xValues = [];
                            let yValuesMovingAvg = [];
                            let yValuesGoal = [];
                            let canRender = false;
                            
                            if (dataForChart && dataForChart.length >= 2 && dataForChart[0] && dataForChart[1] && Array.isArray(dataForChart[0]) && dataForChart[0].length >= 1) {
                                xValues = dataForChart[0].map(d => d.x);
                                yValuesMovingAvg = dataForChart[1].map(d => d.y);
                                canRender = true; 
                                
                                if (${isCalories} && dataForChart.length > 2 && dataForChart[2] && Array.isArray(dataForChart[2])) {
                                    const tempGoalMap = new Map(dataForChart[2].map(p => [p.x, p.y]));
                                    yValuesGoal = xValues.map(x => tempGoalMap.get(x) === undefined ? null : tempGoalMap.get(x));
                                }
                            }

                            if (canRender) {
                                chartElement.innerHTML = '';
                                const uPlotInstanceData = ${isCalories} 
                                    ? [xValues, yValuesMovingAvg, yValuesGoal] 
                                    : [xValues, yValuesMovingAvg];
                                
                                const opts = {
                                    title: "${chartTitle}",
                                    width: chartElement.offsetWidth,
                                    height: ${chartHeightInHTML},
                                    tzDate: ts => uPlot.tzDate(new Date(ts * 1000), '${Localization.getCalendars()?.[0]?.timeZone || 'UTC'}'),
                                    scales: { x: { time: true }, y: { range: (self, min, max) => [0, Math.max(10, max * 1.25)] } },
                                    axes: [
                                        { stroke: "${textColor}", font: "12px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 } },
                                        { stroke: "${textColor}", font: "12px ${fontFamily}", grid: { stroke: "${gridColor}", width: 1 }, ticks: { stroke: "${gridColor}", width: 1 }, values: (self, ticks) => ticks.map(rawValue => Math.round(rawValue)) }
                                    ],
                                    series: ${JSON.stringify(seriesConfig)},
                                    legend: { show: false },
                                    cursor: { drag: { setScale: false }, focus: { prox: 30 }, points: { size: 6, fill: (self, i) => self.series[i]._stroke, stroke: (self, i) => self.series[i]._stroke } }
                                };
                                new uPlot(opts, uPlotInstanceData, chartElement);
                            }
                        } catch (e) {
                            console.error('Chart Error ${macro}', e);
                        }
                    })();
                </script>
            `;}).join("")}
        </body>
        </html>
        `;
  };

  return (
    <View style={[styles.webViewContainer, { height: totalEstimatedWebViewHeight }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: generateChartHTML(), baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : '' }}
        style={styles.webView}
        scalesPageToFit={false} // FIX: Disabled to prevent zoom issues
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // FIX: Removed androidLayerType="software" to fix invisibility
        onError={(syntheticEvent) => console.warn('WebView error: ', syntheticEvent.nativeEvent)}
        // FIX: Removed 'key' prop to prevent full re-mounting on every update
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    width: "100%",
    marginTop: 10,
    minHeight: 250,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99, // FIX: Android hack to prevent flickering in ScrollViews
  },
});

export default StatisticsChart;