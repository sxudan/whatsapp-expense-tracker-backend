import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface ChartData {
  labels: string[];
  data: number[];
  total?: number;
}

export interface BarChartData {
  labels: string[];
  data: number[];
  total?: number;
}

@Injectable()
export class ChartService {
  private readonly quickChartUrl = 'https://quickchart.io/chart';

  /**
   * Generate a pie chart URL using QuickChart API
   */
  generatePieChartUrl(data: ChartData, title?: string): string {
    // Validate data
    if (
      !data.labels ||
      data.labels.length === 0 ||
      !data.data ||
      data.data.length === 0
    ) {
      console.error('Invalid chart data:', data);
      throw new Error('Chart data is empty or invalid');
    }

    // Ensure all data values are numbers
    const numericData = data.data.map((val) => Number(val));

    // Calculate total if not provided
    const total = data.total || numericData.reduce((sum, val) => sum + val, 0);

    // Format labels with values for better visibility
    const labelsWithValues = data.labels.map((label, index) => {
      const value = numericData[index];
      return `${label}: $${value.toFixed(2)}`;
    });

    // Include total in title
    const titleWithTotal = title
      ? `${title}\nTotal: $${total.toFixed(2)}`
      : `Total: $${total.toFixed(2)}`;

    const chartConfig = {
      type: 'outlabeledPie',
      data: {
        labels: labelsWithValues,
        datasets: [
          {
            data: numericData,
            backgroundColor: this.generateColors(data.labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        devicePixelRatio: 2,
        title: {
          display: true,
          text: titleWithTotal,
          fontSize: 18,
          fontColor: '#333',
          padding: 20,
        },
        legend: {
          display: false, // Hide legend since labels are shown outside
        },
        plugins: {
          outlabels: {
            text: '%l',
            color: 'black',
            stretch: 35,
            font: {
              resizable: true,
              minSize: 14,
              maxSize: 16,
            },
            lineWidth: 2,
            lineColor: 'black',
          },
        },
      },
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `${this.quickChartUrl}?c=${encodedConfig}`;
  }

  /**
   * Generate a pie chart image as base64 (alternative to URL)
   */
  async generatePieChartBase64(
    data: ChartData,
    title?: string,
  ): Promise<string> {
    const chartUrl = this.generatePieChartUrl(data, title);
    try {
      const response = await axios.get(chartUrl, {
        responseType: 'arraybuffer',
      });
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Error generating chart image:', error);
      throw new Error('Failed to generate chart image');
    }
  }

  /**
   * Generate color palette for chart
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF',
      '#4BC0C0',
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
    ];

    // Repeat colors if needed
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  /**
   * Generate a bar chart URL using QuickChart API for daily expenses
   */
  generateBarChartUrl(data: BarChartData, title?: string): string {
    // Validate data
    if (
      !data.labels ||
      data.labels.length === 0 ||
      !data.data ||
      data.data.length === 0
    ) {
      console.error('Invalid bar chart data:', data);
      throw new Error('Bar chart data is empty or invalid');
    }

    // Ensure all data values are numbers
    const numericData = data.data.map((val) => Number(val));

    // Calculate total if not provided
    const total = data.total || numericData.reduce((sum, val) => sum + val, 0);

    // Include total in title
    const titleWithTotal = title
      ? `${title}\nTotal: $${total.toFixed(2)}`
      : `Total: $${total.toFixed(2)}`;

    const chartConfig = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Daily Expenses',
            data: numericData,
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        devicePixelRatio: 2,
        title: {
          display: true,
          text: titleWithTotal,
          fontSize: 18,
          fontColor: '#333',
          padding: 20,
        },
        legend: {
          display: false,
        },
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                callback: (value: number) => `$${value.toFixed(0)}`,
              },
              scaleLabel: {
                display: true,
                labelString: 'Amount ($)',
              },
            },
          ],
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: 'Date',
              },
            },
          ],
        },
        tooltips: {
          callbacks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: (tooltipItem: any) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              const value = Number(tooltipItem.yLabel || 0);
              return `$${value.toFixed(2)}`;
            },
          },
        },
      },
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `${this.quickChartUrl}?c=${encodedConfig}`;
  }
}
