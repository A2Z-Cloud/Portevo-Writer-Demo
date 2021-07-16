from invoke import task

@task
def test(ctx):
    """
    Run the tests in the test folder.
    """
    ctx.run('clear && source nenv/bin/activate && npm run test')