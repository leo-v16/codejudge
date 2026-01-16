class Solution:
    def isPalindrome(self, s):
        pass


if __name__ == "__main__":
    import sys
    s = sys.stdin.read().strip()

    result = Solution().isPalindrome(s)
    print(str(result).lower())
