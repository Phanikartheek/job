-- Create prediction feedback table for MLOps
CREATE TABLE public.prediction_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_id UUID REFERENCES public.job_analyses(id) ON DELETE CASCADE,
  predicted_fraud BOOLEAN NOT NULL,
  actual_fraud BOOLEAN,
  feedback_type TEXT, -- 'correct', 'incorrect', 'unsure'
  feedback_notes TEXT,
  confidence_score INTEGER NOT NULL,
  model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  feedback_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feedback" 
ON public.prediction_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" 
ON public.prediction_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" 
ON public.prediction_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_prediction_feedback_user_id ON public.prediction_feedback(user_id);
CREATE INDEX idx_prediction_feedback_created_at ON public.prediction_feedback(created_at DESC);
CREATE INDEX idx_prediction_feedback_analysis_id ON public.prediction_feedback(analysis_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_feedback;