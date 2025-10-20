import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
    fill?: boolean
  }[]
}

interface DashboardProps {
  title: string
  charts: {
    type: 'line' | 'bar' | 'doughnut'
    title: string
    data: ChartData
    options?: any
  }[]
  stats?: {
    label: string
    value: string | number
    change?: number
    changeType?: 'increase' | 'decrease'
  }[]
}

const Dashboard: React.FC<DashboardProps> = ({ title, charts, stats }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  }

  const getChartComponent = (chart: any) => {
    const options = { ...defaultOptions, ...chart.options }

    switch (chart.type) {
      case 'line':
        return <Line data={chart.data} options={options} />
      case 'bar':
        return <Bar data={chart.data} options={options} />
      case 'doughnut':
        return <Doughnut data={chart.data} options={options} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{title}</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {stat.value}
                  </p>
                </div>
                {stat.change !== undefined && (
                  <div
                    className={`flex items-center text-sm font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    <span className="mr-1">
                      {stat.changeType === 'increase' ? '↗' : '↘'}
                    </span>
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6"
          >
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              {chart.title}
            </h3>
            <div className="h-64">
              {getChartComponent(chart)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
