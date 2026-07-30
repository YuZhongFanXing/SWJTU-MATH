function I = composite_cotes(f, a, b, n)
    if mod(n, 4) ~= 0
        error('n must be multiple of 4 for Cotes'' rule');
    end
    h = (b - a) / n;
    x = linspace(a, b, n+1);
    y = f(x);
    
    I = 0;
    for i = 1:4:n
        I = I + (7*y(i) + 32*y(i+1) + 12*y(i+2) + 32*y(i+3) + 7*y(i+4));
    end
    I = I * 2*h/45;
end