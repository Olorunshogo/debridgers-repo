Do we have rate limiter for our auth? if yes, what is it? how do protect our server from ddos? Are we doing ip-listing check?

We need to manually test all the endpoints?

# Tomorrow task

Ensure Frontend is integration
Recommend: Both ✅

Why:

IP only: Attacker could try different emails from same IP → slips through
Email + IP only: Attacker could try same email from different IPs → slips through
Both: Catches both attacks:
One IP trying many emails → blocked at IP level
One email tried from many IPs → blocked at email level
Implementation:

Track two counters:

failed_attempts:IP - blocks entire IP after 5/10/11+ failures
failed_attempts:EMAIL:IP - blocks specific email+IP combo
