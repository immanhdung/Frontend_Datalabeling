export interface User {
  id: string;
  name: string;
  role: 'reviewer' | 'annotator' | 'manager' | 'admin';
  email: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  type: 'image' | 'text' | 'audio' | 'video';
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed' | 'rejected';
  assignedTo?: string;
  projectId: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

export interface Annotation {
  id: string;
  taskId: string;
  annotatorId: string;
  data: any;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewerId?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  completed: number;
  pending: number;
  approved?: number;
  rejected?: number;
  inProgress?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'image' | 'text' | 'audio' | 'video';
  status: 'active' | 'completed' | 'archived';
  createdBy: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
}
