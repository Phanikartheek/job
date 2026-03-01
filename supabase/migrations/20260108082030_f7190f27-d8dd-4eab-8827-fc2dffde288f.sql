-- Create a table for job analysis history
CREATE TABLE public.job_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  salary TEXT,
  description TEXT,
  is_fraud BOOLEAN NOT NULL DEFAULT false,
  confidence INTEGER NOT NULL DEFAULT 0,
  factors TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own analyses" 
ON public.job_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses" 
ON public.job_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.job_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_job_analyses_user_id ON public.job_analyses(user_id);
CREATE INDEX idx_job_analyses_created_at ON public.job_analyses(created_at DESC);