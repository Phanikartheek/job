-- Enable realtime for job_analyses table only (prediction_feedback already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_analyses;