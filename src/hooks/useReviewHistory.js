import { useEffect, useState } from 'react';

const readReviewHistory = () => {
  try {
    const saved = localStorage.getItem('reviewHistory');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
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
