function I = composite_simpson(f, a, b, n)
    % 复化Simpson公式实现 - 严格遵循标准形式
    if mod(n, 2) ~= 0
        error('n must be even for Simpson''s rule');
    end
    
    h = (b - a) / n;  % 小区间长度
    x = linspace(a, b, n+1);
    y = f(x);
    
    % 生成中点
    x_mid = (x(1:end-1) + x(2:end))/2;
    y_mid = f(x_mid);
    
    % 应用标准Simpson公式: h/6 * [f(a) + 4*sum(midpoints) + 2*sum(internal points) + f(b)]
    I = h/6 * (y(1) + 4*sum(y_mid) + 2*sum(y(2:end-1)) + y(end));
end