import { useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';

export const useDispatch = () => useAppDispatch();
export const useSelector = useAppSelector;
