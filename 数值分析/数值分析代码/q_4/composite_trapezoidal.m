function I = composite_trapezoidal(f, a, b, n)
    h = (b - a) / n;
    x = linspace(a, b, n+1);%x_i=a+h*i
    y = f(x);
    I = h * (0.5*y(1) + sum(y(2:end-1)) + 0.5*y(end));%复化的梯形公式
end