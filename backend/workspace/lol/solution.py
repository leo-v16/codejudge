class Solution:
    def secondLargest(self, nums):
        return sum(nums)


if __name__ == "__main__":
    import sys

    data = list(map(int, sys.stdin.read().split()))
    idx = 0

    t = data[idx]
    idx += 1

    sol = Solution()

    for _ in range(t):
        n = data[idx]
        idx += 1
        nums = data[idx:idx+n]
        idx += n

        print(sol.secondLargest(nums))
