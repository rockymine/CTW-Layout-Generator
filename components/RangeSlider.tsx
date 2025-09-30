import React, { useCallback, useEffect, useRef } from 'react';
import { DistanceConstraint } from '../types';

interface RangeSliderProps {
    label: string;
    value: DistanceConstraint;
    onChange: (value: DistanceConstraint) => void;
    min: number;
    max: number;
    step: number;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ label, value, onChange, min, max, step }) => {
    const minValRef = useRef<HTMLInputElement>(null);
    const maxValRef = useRef<HTMLInputElement>(null);
    const range = useRef<HTMLDivElement>(null);

    const getPercent = useCallback((val: number) => Math.round(((val - min) / (max - min)) * 100), [min, max]);

    useEffect(() => {
        const minPercent = getPercent(value.min);
        const maxPercent = getPercent(value.max);

        if (range.current) {
            range.current.style.left = `${minPercent}%`;
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [value, getPercent]);

    const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newMinVal = Math.min(+event.target.value, value.max - step);
        onChange({ ...value, min: newMinVal });
    };

    const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newMaxVal = Math.max(+event.target.value, value.min + step);
        onChange({ ...value, max: newMaxVal });
    };

    return (
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-400 mb-2">{label}</label>
            <div className="flex items-center space-x-2">
                <div className="relative flex-grow flex items-center h-8">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value.min}
                        ref={minValRef}
                        onChange={handleMinChange}
                        className="thumb thumb--zindex-3"
                        aria-label={`${label} minimum value`}
                    />
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value.max}
                        ref={maxValRef}
                        onChange={handleMaxChange}
                        className="thumb thumb--zindex-4"
                        aria-label={`${label} maximum value`}
                    />
                    <div className="slider relative w-full">
                        <div className="slider__track absolute w-full h-1 bg-gray-600 rounded-full z-1" />
                        <div ref={range} className="slider__range absolute h-1 bg-blue-500 rounded-full z-2" />
                    </div>
                </div>
                <div className="flex items-center space-x-1 w-28">
                     <input
                        type="number"
                        value={value.min}
                        onChange={(e) => onChange({ ...value, min: Math.min(+e.target.value, value.max) })}
                        className="w-1/2 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                        min={min}
                        max={max}
                        aria-label={`${label} minimum input`}
                    />
                     <input
                        type="number"
                        value={value.max}
                        onChange={(e) => onChange({ ...value, max: Math.max(+e.target.value, value.min) })}
                        className="w-1/2 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                        min={min}
                        max={max}
                        aria-label={`${label} maximum input`}
                    />
                </div>
            </div>
            <style>{`
                .thumb {
                    pointer-events: none;
                    position: absolute;
                    height: 0;
                    width: 100%;
                    outline: none;
                }
                .thumb, .thumb::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .thumb::-webkit-slider-thumb {
                    pointer-events: all;
                    width: 18px;
                    height: 18px;
                    background-color: #d1d5db;
                    border-radius: 50%;
                    border: 3px solid #3b82f6;
                    box-shadow: 0 0 0 1px #1f2937;
                    cursor: pointer;
                    margin-top: -8px; /* half of height */
                }
                .thumb::-moz-range-thumb {
                    pointer-events: all;
                    width: 18px;
                    height: 18px;
                    background-color: #d1d5db;
                    border-radius: 50%;
                    border: 3px solid #3b82f6;
                    box-shadow: 0 0 0 1px #1f2937;
                    cursor: pointer;
                }
                .thumb--zindex-3 { z-index: 3; }
                .thumb--zindex-4 { z-index: 4; }
            `}</style>
        </div>
    );
};

export default RangeSlider;
