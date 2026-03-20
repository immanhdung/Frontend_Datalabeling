import { useEffect, useState } from 'react';

const readReviewHistory = () => {
  try {
    const saved = localStorage.getItem('reviewHistory');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function useReviewHistory() {
  const [reviewHistory, setReviewHistory] = useState(() => readReviewHistory());

  useEffect(() => {
    const handleStorageChange = () => {
      setReviewHistory(readReviewHistory());
    };

    window.addEventListener('reviewHistoryUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('reviewHistoryUpdated', handleStorageChange);
    };
  }, []);

  return { reviewHistory, setReviewHistory };
}
