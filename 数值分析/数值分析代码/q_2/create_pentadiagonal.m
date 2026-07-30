function A = create_pentadiagonal(n)
    main_diag = 20 * ones(n, 1);
    sub1_diag = -8 * ones(n-1, 1);
    sub2_diag = 1 * ones(n-2, 1);
    A = diag(main_diag) + diag(sub1_diag, -1) + diag(sub1_diag, 1) + diag(sub2_diag, -2) + diag(sub2_diag, 2);
end