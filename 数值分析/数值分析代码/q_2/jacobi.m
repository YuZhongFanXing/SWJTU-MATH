function [x, iter] = jacobi(A, x0, tol)
    n = length(x0);%根据初始解的向量判断矩阵的阶数，便于在主函数中利用生成矩阵的函数来生成对应阶数的函数
    x = x0;%初始解，题目中为全为1的向量
    iter = 0;%迭代次数，初始为0
    
    while true
        iter = iter + 1;
        x_new = zeros(n, 1); %用于存放每次迭代的解向量的元素
        
        for i = 1:n
            sum_term = 0;
            for j = 1:n
                if j ~= i
                    sum_term = sum_term + A(i,j) * x(j);%(-a_i1*x1^k - ... - a_in*xn^k)
                end
            end
            % 公式: x_i^(k+1) = (1/a_ii)(-a_i1*x1^k - ... - a_in*xn^k)
            x_new(i) = -sum_term / A(i,i);%计算这次迭代的解的第i个元素
        end
        
        % 检查收敛条件 ||x^(k)-x*||_inf <= tol，x*为精确解——零向量
        if norm(x_new, inf) <= tol
            break;
        end
        
        x = x_new;%一次迭代结束后的解
    end
end