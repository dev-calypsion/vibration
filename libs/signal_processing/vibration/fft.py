import numpy as np
from scipy.signal import get_window

def compute_fft(signal, sample_rate, window='hann'):
    """
    Computes the single-sided FFT of a real signal.
    
    Args:
        signal (list or np.array): Time-domain signal.
        sample_rate (float): Sampling frequency in Hz.
        window (str): Window function to apply (default: 'hann').
        
    Returns:
        dict: {
            "frequencies": list[float],
            "amplitudes": list[float]
        }
    """
    n = len(signal)
    if n == 0:
        return {"frequencies": [], "amplitudes": []}
        
    # Apply window
    if window:
        win = get_window(window, n)
        signal = signal * win
        
    # Compute FFT
    fft_values = np.fft.fft(signal)
    
    # Compute frequencies
    freqs = np.fft.fftfreq(n, d=1/sample_rate)
    
    # Take positive half
    half_n = n // 2
    positive_freqs = freqs[:half_n]
    positive_amplitudes = np.abs(fft_values[:half_n]) * 2 / n  # Normalize
    
    return {
        "frequencies": positive_freqs.tolist(),
        "amplitudes": positive_amplitudes.tolist()
    }
