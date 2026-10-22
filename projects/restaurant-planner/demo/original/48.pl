check_staff(Day, Time, Reservations) :-
	count_all_time_reservations(Reservations,Day,Time,0,ReservationsCount),
	staff(Day,StaffCount),
	ReservationsCount =< StaffCount.

count_all_time_reservations([],_,_,Acc,Acc).

count_all_time_reservations([H|T],Day,Time,Acc,Res) :-
	res(Day,Time,_,_) = H,
	NewAcc is Acc + 1,
	count_all_time_reservations(T,Day,Time,NewAcc,Res).

count_all_time_reservations([H|T],Day,Time,Acc,Res) :-
	res(X,Y,_,_) = H,
	(X \= Day;
	Y \= Time),
	count_all_time_reservations(T,Day,Time,Acc,Res).


% If Schedule is just a variable (No given reservation list)
schedule_all_reservations(Days, Schedule) :-
	\+ is_list(Schedule),
    findall(group(Name, Count, Pref), group(Name, Count, Pref), Groups),
	assign_groups(Groups, Days, [], Schedule).

% If Schedule is not a variable (There is a given reservation list)
schedule_all_reservations(Days, Schedule) :-
	is_list(Schedule),
    findall(group(Name, Count, Pref), group(Name, Count, Pref), Groups),
%   #1 Each group is assigned to exactly one table.
	length(Groups,X), length(Schedule,X),
%	#2 Each group is assigned on the time it prefers && with a capacity greater than or equal to the group size.
	checkCapacitiesAndPreferences(Groups,Schedule),
%	#3 No two groups are assigned the same table at the same time on the same day.
	checkForDuplicity(Schedule),
%	#4 check_staff for all combinations of days and times
	check_staff_all_days(Days,Schedule).
	
% Once all groups were assigned, set Schedule to the current accumulator value.
assign_groups([], _, Schedule, Schedule).

assign_groups([group(Name, Count, Pref)|Rest], Days, Acc, Schedule) :-
%	Collecting data
    member(Day, Days),
    tables(Tables),
    member(t(Table, Cap), Tables),
%	Beginning to check for conditions
%	#1 Table capacity is greater than or equal to the group size
    Cap >= Count,
%	#2 No two groups are assigned the same table at the same time on the same day.
    \+ member(res(Day, Pref, _, Table), Acc),
%	#3 Each group is assigned on the time it prefers.
    NewRes = res(Day, Pref, Name, Table),
    NewAcc = [NewRes | Acc],
%	#4 For each day and time, the number of tables filled cannot exceed the number of staff members available on that day.
    check_staff(Day, Pref, NewAcc),
%	#5 Assigning the rest of the groups (Each group is assigned to exactly one table).
    assign_groups(Rest, Days, NewAcc, Schedule).

% Base Case : All reservations satisfy the conditions
checkCapacitiesAndPreferences([],_).
checkCapacitiesAndPreferences([group(Name, Count, Pref)|T],Schedule) :-
%	#1 : Checking whether a group is assigned to a table at its prefered time
	member(res(_,Pref,Name,Table),Schedule),
%	#2 : Extracting table capacity from the KB
	tables(Tables),
	member(t(Table,Capacity),Tables),
%	#3 : Checking if the table is capacity is suitable for the assigned group
	Capacity >= Count,
%	#4 : Repeat for the rest of the groups
	checkCapacitiesAndPreferences(T,Schedule).

% Base Case : No duplicate reservations
checkForDuplicity([]).
% Returns true if no duplicates, and false otherwise
checkForDuplicity([res(Day,Time,_,Table)|T]) :-
	\+ member(res(Day,Time,_,Table),T),
	checkForDuplicity(T).

% Base Case : all combinations of days with times satisfy check_staff constraint.
check_staff_all_days([],_).
% Returns true if all combinations of days with times satisfy check_staff condition, and false otherwise.
check_staff_all_days([H|T],Schedule) :-
	check_staff(H,morning,Schedule),
	check_staff(H,evening,Schedule),
	check_staff_all_days(T,Schedule).
	
group_ingredients(GroupName, Ingredients) :-
    order(GroupName, DishNames),
    next(DishNames, Ingredients).

next([], []).
next([Dish|Tail], AllIngredients) :-
    recipe(Dish, DishIngredients),
    next(Tail, RemainingIngredients),
    append(DishIngredients, RemainingIngredients, AllIngredients).

	
res(_,_,_,_).

ingredients([],[]).
ingredients([H|T], X):-
	recipe(H,H1),
	append(H1,X1,X),
	ingredients(T,X1).

needed_ingredients(Reservations, AllIngredients) :-
    collect(Reservations, Temp),
    merge_days(Temp, AllIngredients).

collect([], []).
collect([res(Day, _, Group, _)|Rest], [(Day, Ingredients)|T]) :-
    order(Group, X),
    ingredients( X, Ingredients),
    collect(Rest, T).

merge_days([], []).
merge_days([(Day, IngList)|Rest], Result) :-
    same_day(Day, Rest, IngList, Remaining, Combined),
    merge_days(Remaining, Temp),
    Result = [(Day, Combined)|Temp].

same_day(_, [], Acc, [], Acc).
same_day(Day, [(Day, L)|Rest], Acc, Remaining, Combined) :-
    append(Acc, L, NewAcc),
    same_day(Day, Rest, NewAcc, Remaining, Combined).
same_day(Day, [(Other, L)|Rest], Acc, [(Other, L)|Remaining], Combined) :-
    Day \= Other,
    same_day(Day, Rest, Acc, Remaining, Combined).

write_reservations_to_csv(Filename, Schedule) :-
    open(Filename, write, Stream),
    write(Stream, 'Day,Month,Time,Group,Table'),
    nl(Stream),
    write_res_rows(Stream, Schedule),
    close(Stream).

write_res_rows(_, []).
write_res_rows(Stream, [res(day(D, M), Time, Group, Table) | Rest]) :-
    write(Stream, D),
    write(Stream, ','),
    write(Stream, M),
    write(Stream, ','),
    write(Stream, Time),
    write(Stream, ','),
    write(Stream, Group),
    write(Stream, ','),
    write(Stream, Table),
    nl(Stream),
    write_res_rows(Stream, Rest).
	
write_ingredients_to_csv(Filename, AllIngredients) :-
    open(Filename, write, Stream),
	write(Stream, 'Day,Month,Ingredients'),
    nl(Stream),
    write_days_to_stream(Stream, AllIngredients),
    close(Stream).
write_days_to_stream(_, []).
write_days_to_stream(Stream, [(day(D, M), Ingredients) | Tail]) :-
    write(Stream, D), 
    write(Stream, ','),
    write(Stream, M), 
    write(Stream, ','),
    write_ingredients_separated(Stream, Ingredients),
    nl(Stream),
    write_days_to_stream(Stream, Tail).
write_ingredients_separated(_, []).
write_ingredients_separated(Stream, [LastIngredient]) :-
    write(Stream, LastIngredient).
write_ingredients_separated(Stream, [Head, Next | Tail]) :-
    write(Stream, Head), 
    write(Stream, ';'),
    write_ingredients_separated(Stream, [Next | Tail]).
