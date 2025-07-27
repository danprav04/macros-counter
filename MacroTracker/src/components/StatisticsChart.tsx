// src/components/StatisticsChart.tsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Statistics, MacroType, macros as macroKeys } from "../types/settings";
import { useTheme } from "@rneui/themed";
import { t } from '../localization/i18n';
import i18n from '../localization/i18n'; // Import i18n for locale
import * as Localization from 'expo-localization'; // Import Localization

// Declare uPlot as a global variable for TypeScript, as it's loaded via CDN in the WebView
declare const uPlot: any;

// Local interface for uPlot Series configuration to help TypeScript
interface uPlotSeriesConfig {
  stroke?: string;
  width?: number;
  label?: string;
  points?: { show?: boolean; size?: number; fill?: string; stroke?: string; };
  dash?: number[];
  fill?: string;
  // Add other series properties if you use them
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
        default:
            const exhaustiveCheck: never = macro;
            return exhaustiveCheck;
    }
  };

  const chartHeightInHTML = 250;
  const chartVerticalMarginInHTML = 20;
  const totalEstimatedWebViewHeight = macroKeys.length * (chartHeightInHTML + chartVerticalMarginInHTML) + 40; // Extra padding for safety

  const generateChartHTML = () => {
    const chartData = (macroKeys as readonly MacroType[]).reduce((acc, macro) => {
      acc[macro] = statistics[macro].map((series) =>
        series.map((item) => ({ x: item.x / 1000, y: item.y })) // Ensure x is in seconds
      );
      return acc;
    }, {} as { [key in MacroType]: { x: number; y: number }[][] });

    const textColor = theme.colors.text;
    const gridColor = theme.colors.grey5;
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
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
            <title>Macro Charts</title>
            <style>
                body { font-family: ${fontFamily}; margin: 0; padding: 0; background-color: ${theme.colors.background}; color: ${textColor}; overflow-x: hidden; }
                .chart-container { width: 95%; height: ${chartHeightInHTML}px; margin: ${chartVerticalMarginInHTML / 2}px auto; }
                .no-data-message { display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: ${textColor}; font-size: 14px; }
                .u-legend .u-series > td { min-width: 50px; } /* Ensure legend items have some width */
            </style>
            <link rel="stylesheet" href="https://unpkg.com/uplot@1.6.27/dist/uPlot.min.css">
            <script src="https://unpkg.com/uplot@1.6.27/dist/uPlot.iife.min.js"></script>
        </head>
        <body>
            ${(macroKeys as readonly MacroType[]).map((macro) => {
                const currentMacroData = chartData[macro];
                const chartTitle = getChartTitle(macro);
                const isCalories = macro === "calories";
                
                const dailyLabel = t('statisticsChart.daily');
                const movingAverageLabel = t('statisticsChart.movingAverage');
                const goalLabel = t('statisticsChart.goal');

                const rawIntakeSeries: uPlotSeriesConfig = {
                    stroke: `${lineColors[macro]}80`,
                    width: 1,
                    label: dailyLabel,
                    points: { show: false },
                };

                const movingAverageSeries: uPlotSeriesConfig = {
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
                    rawIntakeSeries,
                    movingAverageSeries
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
                            let canRender = false;

                            let xValues = [];
                            let yValuesIntake = [];
                            let yValuesMovingAvg = [];
                            let yValuesGoal = [];
                            
                            // data structure: [ [intake], [moving_avg], [goal]? ]
                            if (dataForChart && dataForChart.length >= 2 && dataForChart[0] && dataForChart[1] && Array.isArray(dataForChart[0]) && dataForChart[0].length >= 1) {
                                xValues = dataForChart[0].map(d => d.x);
                                yValuesIntake = dataForChart[0].map(d => d.y);
                                yValuesMovingAvg = dataForChart[1].map(d => d.y);
                                canRender = true; 
                                
                                if (${isCalories} && dataForChart.length > 2 && dataForChart[2] && Array.isArray(dataForChart[2])) {
                                    const tempGoalMap = new Map(dataForChart[2].map(p => [p.x, p.y]));
                                    yValuesGoal = xValues.map(x => tempGoalMap.get(x) === undefined ? null : tempGoalMap.get(x));
                                }
                            }

                            if (canRender) {
                                chartElement.innerHTML = ''; // Clear "no data" message
                                const uPlotInstanceData = ${isCalories} 
                                    ? [xValues, yValuesIntake, yValuesMovingAvg, yValuesGoal] 
                                    : [xValues, yValuesIntake, yValuesMovingAvg];
                                
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
                                    cursor: { drag: { setScale: false }, focus: { prox: 30 }, points: { size: 6, fill: (self, i) => self.series[i]._stroke, stroke: (self, i) => self.series[i]._stroke } },
                                    ${isCalories ? `
                                    hooks: {
                                        draw: [
                                            (u) => {
                                                const { ctx, data } = u;
                                                // Now there are 4 series for calories: x, intake, movingAvg, goal
                                                if (!data || data.length < 4 || !data[1] || !data[3]) return; 
                                                if (!u.series[1] || !u.series[1].show || !u.series[3] || !u.series[3].show) return;

                                                const ts = data[0];
                                                const intake = data[1]; // Raw intake is at index 1
                                                const goal = data[3];   // Goal is at index 3

                                                if (ts.length < 2) return; // Need at least two points to draw an area

                                                ctx.save();
                                                ctx.fillStyle = "rgba(231, 76, 60, 0.15)";
                                                
                                                let currentSegment = [];

                                                for (let i = 0; i < ts.length; i++) {
                                                    if (intake[i] != null && goal[i] != null && intake[i] > goal[i]) {
                                                        currentSegment.push({ x: ts[i], intakeY: intake[i], goalY: goal[i] });
                                                    } else {
                                                        if (currentSegment.length > 1) { // Need at least 2 points to draw a segment
                                                            ctx.beginPath();
                                                            ctx.moveTo(u.valToPos(currentSegment[0].x, "x", true), u.valToPos(currentSegment[0].goalY, "y", true));
                                                            currentSegment.forEach(pt => ctx.lineTo(u.valToPos(pt.x, "x", true), u.valToPos(pt.intakeY, "y", true)));
                                                            for (let k = currentSegment.length - 1; k >= 0; k--) {
                                                                ctx.lineTo(u.valToPos(currentSegment[k].x, "x", true), u.valToPos(currentSegment[k].goalY, "y", true));
                                                            }
                                                            ctx.closePath();
                                                            ctx.fill();
                                                        }
                                                        currentSegment = [];
                                                    }
                                                }
                                                if (currentSegment.length > 1) {
                                                    ctx.beginPath();
                                                    ctx.moveTo(u.valToPos(currentSegment[0].x, "x", true), u.valToPos(currentSegment[0].goalY, "y", true));
                                                    currentSegment.forEach(pt => ctx.lineTo(u.valToPos(pt.x, "x", true), u.valToPos(pt.intakeY, "y", true)));
                                                    for (let k = currentSegment.length - 1; k >= 0; k--) {
                                                        ctx.lineTo(u.valToPos(currentSegment[k].x, "x", true), u.valToPos(currentSegment[k].goalY, "y", true));
                                                    }
                                                    ctx.closePath();
                                                    ctx.fill();
                                                }
                                                ctx.restore();
                                            }
                                        ]
                                    }` : ''}
                                };
                                new uPlot(opts, uPlotInstanceData, chartElement);
                            }
                        } catch (e) {
                            console.error('--- ERROR in uPlot script for ${macro} ---', e.message, e.stack);
                            chartElement.innerHTML = '<div class="no-data-message" style="color:red;">Chart Error: ' + e.message + '</div>';
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
        source={{ html: generateChartHTML(), baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : '' }} // baseUrl for Android
        style={styles.webView}
        scalesPageToFit={Platform.OS === 'android'}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const {nativeEvent} = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => { // Useful for 404s on resources like uPlot CSS/JS if CDN fails
            const {nativeEvent} = syntheticEvent;
            console.warn('WebView HTTP error: ', nativeEvent.url, nativeEvent.statusCode, nativeEvent.description);
        }}
        // Log messages from WebView's console.log to React Native console
        onMessage={(event) => {
            console.log("WebView Message:", event.nativeEvent.data);
        }}
        // Inject JavaScript to bridge console.log, console.error, etc.
        // Note: This basic bridge might not capture all nuances or complex objects perfectly.
        injectedJavaScript={`
            (function() {
                const originalConsoleLog = console.log;
                const originalConsoleError = console.error;
                const originalConsoleWarn = console.warn;
                const originalConsoleInfo = console.info;
                const originalConsoleDebug = console.debug;

                const rnBridgePost = (type, args) => {
                    const message = args.map(arg => {
                        if (typeof arg === 'object' || typeof arg === 'function') {
                            try {
                                return JSON.stringify(arg);
                            } catch (e) {
                                return '[Unserializable Object]';
                            }
                        }
                        return String(arg);
                    }).join(' ');
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONSOLE', level: type, message: message }));
                };

                console.log = function() { originalConsoleLog.apply(console, arguments); rnBridgePost('LOG', Array.from(arguments)); };
                console.error = function() { originalConsoleError.apply(console, arguments); rnBridgePost('ERROR', Array.from(arguments)); };
                console.warn = function() { originalConsoleWarn.apply(console, arguments); rnBridgePost('WARN', Array.from(arguments)); };
                console.info = function() { originalConsoleInfo.apply(console, arguments); rnBridgePost('INFO', Array.from(arguments)); };
                console.debug = function() { originalConsoleDebug.apply(console, arguments); rnBridgePost('DEBUG', Array.from(arguments)); };
                window.onerror = function(message, source, lineno, colno, error) {
                    rnBridgePost('GLOBAL_ERROR', [message, 'at', source + ':' + lineno + ':' + colno, error ? error.stack : '']);
                    return false; // Let default handler run.
                };
            })();
            true; // note: this is required, or you'll sometimes get silent failures
        `}
        key={`stat-chart-${theme.mode}-${i18n.locale}-${JSON.stringify(statistics).length}`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    width: "100%",
    marginTop: 10,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default StatisticsChart;