import numpy as np
from scipy.signal import hilbert, butter, filtfilt
from .fft import compute_fft

def compute_envelope_spectrum(signal, sample_rate, bandpass_filter=None):
    """
    Computes the envelope spectrum (Demodulation) for bearing fault detection.
    
    Args:
        signal (list or np.array): Time-domain signal.
        sample_rate (float): Sampling frequency in Hz.
        bandpass_filter (tuple): Optional (low_cutoff, high_cutoff) for bandpass filtering before envelope.
        
    Returns:
        dict: FFT of the envelope signal.
    """
    signal = np.array(signal)
    
    # Bandpass filter (optional but recommended for bearing faults)
    if bandpass_filter:
        nyquist = 0.5 * sample_rate
        low = bandpass_filter[0] / nyquist
        high = bandpass_filter[1] / nyquist
        b, a = butter(4, [low, high], btype='band')
        signal = filtfilt(b, a, signal)
        
    # Hilbert Transform to get analytic signal
    analytic_signal = hilbert(signal)
    
    # Envelope is the magnitude of the analytic signal
    envelope = np.abs(analytic_signal)
    
    # Remove DC component
    envelope = envelope - np.mean(envelope)
    
    # Compute FFT of the envelope
    return compute_fft(envelope, sample_rate)
