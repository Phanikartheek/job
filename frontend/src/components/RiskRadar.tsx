import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RiskRadarProps {
  data: {
    text: number;
    anomaly: number;
    metadata: number;
    content: number;
    xgboost: number;
  };
}

export const RiskRadar = ({ data }: RiskRadarProps) => {
  const chartData = [
    { subject: 'Text AI', A: data.text, fullMark: 100 },
    { subject: 'Anomaly', A: data.anomaly, fullMark: 100 },
    { subject: 'Metadata', A: data.metadata, fullMark: 100 },
    { subject: 'Content', A: data.content, fullMark: 100 },
    { subject: 'XGBoost', A: data.xgboost, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[300px] mt-4 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
      <h3 className="text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">Model Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff80', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Risk Score"
            dataKey="A"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.5}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff20', borderRadius: '8px' }}
            itemStyle={{ color: '#f97316' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
